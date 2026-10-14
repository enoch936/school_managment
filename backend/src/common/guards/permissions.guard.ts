import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { REQUIRED_ROLES_KEY } from '../decorators/roles.decorator';
import { ForbiddenError } from '../exceptions/domain.exception';
import type { AuthPrincipal, AuthenticatedRequest } from '../interfaces/auth-principal.interface';

/**
 * Enforces `@RequirePermissions(...)` and `@RequireRoles(...)` metadata against
 * the server-resolved principal. Platform super administrators bypass permission
 * checks, but resource-level tenant scoping is still enforced in services.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length && !requiredRoles?.length) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.user as AuthPrincipal | undefined;
    if (!user) throw new ForbiddenError('Authentication required');

    if (user.isPlatformAdmin) return true;

    if (requiredRoles?.length) {
      const held = new Set(user.memberships.map((m) => m.roleKey).filter(Boolean) as string[]);
      if (!requiredRoles.some((r) => held.has(r))) {
        throw new ForbiddenError('Your role does not allow this action');
      }
    }

    if (requiredPermissions?.length) {
      const missing = requiredPermissions.filter((p) => !user.permissions.has(p));
      if (missing.length) {
        throw new ForbiddenError('You do not have permission to perform this action');
      }
    }

    return true;
  }
}
