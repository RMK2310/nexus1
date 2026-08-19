import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface UserPayload {
  userId: string;
  email: string;
  activeRole: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
