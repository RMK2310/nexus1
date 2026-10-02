import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  UsePipes,
  Headers,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { CurrentUser, UserPayload } from "./current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import {
  RegisterInput,
  RegisterInputSchema,
  LoginInput,
  LoginInputSchema,
  RoleSwitchInput,
  RoleSwitchInputSchema,
} from "@nexus/shared";
import { Request, Response } from "express";

@Controller("api/v1/auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  @UsePipes(new ZodValidationPipe(RegisterInputSchema))
  async register(@Body() input: RegisterInput) {
    const data = await this.authService.register(input);
    return {
      success: true,
      message: "Registration successful. Please proceed to login.",
      data,
    };
  }

  @Post("login")
  @UsePipes(new ZodValidationPipe(LoginInputSchema))
  async login(
    @Body() input: LoginInput,
    @Headers("user-agent") userAgent: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const { user, tokens } = await this.authService.login(input, userAgent);

    // Set refresh token in HttpOnly secure cookie
    response.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return {
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  @Post("refresh")
  async refresh(
    @Req() request: Request,
    @Body("refreshToken") bodyToken: string,
    @Res({ passthrough: true }) response: Response
  ) {
    // Check body first, fallback to cookie
    const token = bodyToken || request.cookies?.refreshToken;

    if (!token) {
      throw new UnauthorizedException("Refresh token not provided");
    }

    const tokens = await this.authService.refresh(token);

    response.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  @Post("role-switch")
  @UseGuards(AuthGuard)
  @UsePipes(new ZodValidationPipe(RoleSwitchInputSchema))
  async switchRole(
    @CurrentUser() user: UserPayload,
    @Body() input: RoleSwitchInput
  ) {
    const data = await this.authService.switchRole(
      user.userId,
      user.email,
      input.role,
      user.roles
    );

    return {
      success: true,
      message: `Switched active role context to ${input.role}`,
      data,
    };
  }

  @Post("logout")
  async logout(
    @Req() request: Request,
    @Body("refreshToken") bodyToken: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const token = request.cookies?.refreshToken || bodyToken;
    await this.authService.logout(token);

    response.clearCookie("refreshToken");

    return {
      success: true,
      message: "Successfully logged out, session terminated",
    };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: UserPayload) {
    const profile = await this.authService.getProfile(user.userId);
    return {
      success: true,
      data: {
        userId: user.userId,
        email: user.email,
        activeRole: user.activeRole,
        roles: user.roles,
        name: profile?.name || "NEXUS User",
        phone: profile?.phone || "",
        walletBalance: profile?.walletBalance || 0,
      },
    };
  }
}
