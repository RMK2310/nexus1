import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import {
  RegisterInput,
  LoginInput,
  UserRole,
} from "@nexus/shared";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  // Secure native scrypt password hashing
  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  // Secure timing-safe verification
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const [hashedPassword, salt] = hash.split(".");
      if (!hashedPassword || !salt) return false;
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const currentBuf = Buffer.from(hashedPassword, "hex");
      return timingSafeEqual(buf, currentBuf);
    } catch {
      return false;
    }
  }

  // Token Generation Helper
  private async generateTokens(
    userId: string,
    email: string,
    activeRole: string,
    roles: string[]
  ) {
    const payload = {
      sub: userId,
      email,
      activeRole,
      roles,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET || "default_access_secret_12345",
      expiresIn: "15m",
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId },
      {
        secret: process.env.JWT_REFRESH_SECRET || "default_refresh_secret_12345",
        expiresIn: "7d",
      }
    );

    return { accessToken, refreshToken };
  }

  // Register user, assign CONSUMER role, and initialize Wallet in a transaction
  async register(input: RegisterInput) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictException("A user with this email address already exists");
    }

    const passwordHash = await this.hashPassword(input.password);

    // Create user, associate default CONSUMER role and Wallet account in transaction
    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          phone: input.phone,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          role: "CONSUMER",
        },
      });

      await tx.walletAccount.create({
        data: {
          userId: user.id,
          balance: 0,
          currency: "INR",
        },
      });

      return user;
    });

    return {
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
    };
  }

  // Login User and generate session
  async login(input: LoginInput, deviceInfo?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { roles: true },
    });

    if (!user || !(await this.verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email address or password");
    }

    const rolesList = user.roles.map((r) => r.role);
    // Default active role is CONSUMER on fresh logins
    const activeRole = rolesList.includes(UserRole.CONSUMER)
      ? UserRole.CONSUMER
      : rolesList[0];

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      activeRole,
      rolesList
    );

    // Save session in database
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        deviceInfo,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        activeRole,
        roles: rolesList,
      },
      tokens,
    };
  }

  // Refresh Token Rotation (RTR)
  async refresh(oldRefreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || "default_refresh_secret_12345",
      });

      const session = await this.prisma.session.findUnique({
        where: { refreshToken: oldRefreshToken },
        include: { user: { include: { roles: true } } },
      });

      if (!session || session.revoked || session.expiresAt < new Date()) {
        if (session) {
          // Breach detection: If token is reused, revoke all user sessions
          await this.prisma.session.updateMany({
            where: { userId: session.userId },
            data: { revoked: true },
          });
        }
        throw new UnauthorizedException("Refresh token is invalid or has expired");
      }

      const user = session.user;
      const rolesList = user.roles.map((r) => r.role);
      const activeRole = UserRole.CONSUMER; // Default active fallback

      const tokens = await this.generateTokens(
        user.id,
        user.email,
        activeRole,
        rolesList
      );

      // Rotate session token
      await this.prisma.$transaction(async (tx) => {
        await tx.session.delete({ where: { id: session.id } });
        await tx.session.create({
          data: {
            userId: user.id,
            refreshToken: tokens.refreshToken,
            deviceInfo: session.deviceInfo,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      });

      return tokens;
    } catch (err) {
      throw new UnauthorizedException("Session expired, please log in again");
    }
  }

  // Switch Active Session Role safely (validates role ownership)
  async switchRole(userId: string, email: string, targetRole: UserRole, currentRoles: string[]) {
    if (!currentRoles.includes(targetRole)) {
      throw new BadRequestException(
        `User does not possess the required [${targetRole}] role profile`
      );
    }

    // Return new access token with changed activeRole context
    const accessToken = (
      await this.generateTokens(userId, email, targetRole, currentRoles)
    ).accessToken;

    return {
      activeRole: targetRole,
      accessToken,
    };
  }

  // Revoke session on logout
  async logout(refreshToken: string) {
    try {
      await this.prisma.session.delete({
        where: { refreshToken },
      });
    } catch {
      // Gracefully handle if session already deleted
    }
    return { success: true };
  }

  // Get user profile details including wallet balance
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
      },
    });
    if (!user) {
      return null;
    }
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      walletBalance: user.wallet ? user.wallet.balance : 0,
    };
  }
}
