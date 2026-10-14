import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ForbiddenError } from '../exceptions/domain.exception';
import type { AuthenticatedRequest } from '../interfaces/auth-principal.interface';

export interface TenantContext {
  organizationId: string;
  schoolId: string | null;
  campusId: string | null;
  isPlatformAdmin: boolean;
}

/**
 * Resolves the active tenant context for the request. The organization id is
 * NEVER read from the body/query; it comes from the validated principal. Throws
 * when a tenant-scoped endpoint is called without a resolvable organization.
 */
export const ActiveTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.user;
    if (!user) throw new ForbiddenError('Authentication required');
    if (!user.activeOrganizationId) {
      throw new ForbiddenError('No organization context is available for this request');
    }
    return {
      organizationId: user.activeOrganizationId,
      schoolId: user.activeSchoolId,
      campusId: user.activeCampusId,
      isPlatformAdmin: user.isPlatformAdmin,
    };
  },
);
