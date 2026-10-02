// Set required environment variables for tests BEFORE any imports that trigger getConfig()
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "file:./test.db";
process.env.JWT_ACCESS_SECRET = "test_access_secret_for_unit_tests_32chars!";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_for_unit_tests_32chars!";

import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@nexus/shared";
import { ConflictException, UnauthorizedException, BadRequestException } from "@nestjs/common";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  // Mock Prisma client transaction and queries
  const mockPrisma: any = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    walletAccount: {
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  const mockJwt = {
    signAsync: jest.fn(() => Promise.resolve("mocked_jwt_token")),
    verifyAsync: jest.fn(() => Promise.resolve({ sub: "user-123", email: "test@nexus.com" })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("Password Hashing & Verification", () => {
    it("should hash a password and verify it successfully", async () => {
      const password = "NexusPass123!";
      // Accessing private methods for unit test
      const hash = await (service as any).hashPassword(password);
      expect(hash).toContain(".");
      
      const isMatch = await (service as any).verifyPassword(password, hash);
      expect(isMatch).toBe(true);

      const isNotMatch = await (service as any).verifyPassword("WrongPass!", hash);
      expect(isNotMatch).toBe(false);
    });
  });

  describe("register", () => {
    it("should throw ConflictException if user email already exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "existing-id" });

      await expect(
        service.register({
          email: "existing@nexus.com",
          password: "NexusPass123!",
          name: "Test User",
        })
      ).rejects.toThrow(ConflictException);
    });

    it("should hash password and create user, role and wallet on register", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({
        id: "user-123",
        email: "test@nexus.com",
        name: "Test User",
      });

      const result = await service.register({
        email: "test@nexus.com",
        password: "NexusPass123!",
        name: "Test User",
      });

      expect(result.userId).toBe("user-123");
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });
  });

  describe("roleSwitch", () => {
    it("should throw BadRequestException if user does not own target role", async () => {
      await expect(
        service.switchRole("user-123", "test@nexus.com", UserRole.DRIVER, ["CONSUMER"])
      ).rejects.toThrow(BadRequestException);
    });

    it("should generate new tokens with updated activeRole payload", async () => {
      const result = await service.switchRole("user-123", "test@nexus.com", UserRole.CONSUMER, [
        "CONSUMER",
        "DRIVER",
      ]);

      expect(result.activeRole).toBe(UserRole.CONSUMER);
      expect(result.accessToken).toBe("mocked_jwt_token");
    });
  });
});
