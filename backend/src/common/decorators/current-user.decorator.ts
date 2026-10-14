import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthPrincipal, AuthenticatedRequest } from '../interfaces/auth-principal.interface';

/** Injects the authenticated principal (or a single field of it). */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthPrincipal | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);
