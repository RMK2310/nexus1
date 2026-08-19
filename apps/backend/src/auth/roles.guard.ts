import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@nexus/shared";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.activeRole) {
      return false;
    }

    // Check if the user's CURRENT active session role is authorized for the endpoint
    const hasRole = requiredRoles.includes(user.activeRole as UserRole);
    if (!hasRole) {
      throw new ForbiddenException(
        `Required active role: [${requiredRoles.join(", ")}]. Current active role: [${user.activeRole}].`
      );
    }
    return true;
  }
}
