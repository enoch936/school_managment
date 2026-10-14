import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthorizationService } from '../../modules/authorization/authorization.service';
import type { AuthenticatedRequest } from '../interfaces/auth-principal.interface';
import type { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

/**
 * Authenticates the request from the access token, then builds the full,
 * server-authoritative principal (memberships + permissions) before the
 * handler runs. Honours the `x-organization-id` header for active tenant
 * context, validated against the user's memberships.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Still attempt to populate the principal if a token is present so that
      // public endpoints can personalise responses, but never block.
      try {
        await super.canActivate(context);
      } catch {
        /* ignore */
      }
      const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
      await this.attachPrincipal(req);
      return true;
    }

    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    await this.attachPrincipal(req, true);
    return true;
  }

  private async attachPrincipal(req: AuthenticatedRequest, required = false): Promise<void> {
    const payload = req.user as unknown as JwtPayload | undefined;
    if (!payload?.sub) {
      if (required) return;
      return;
    }
    const orgHeader = req.header('x-organization-id');
    const principal = await this.authorization.buildPrincipal(
      payload.sub,
      orgHeader ?? null,
      payload.sid ?? null,
    );
    req.user = principal;
  }
}
