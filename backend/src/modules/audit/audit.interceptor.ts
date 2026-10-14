import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { AuthenticatedRequest } from '../../common/interfaces/auth-principal.interface';
import { AUDIT_KEY, AuditMetadata } from './audit.decorator';
import { AuditService } from './audit.service';

/**
 * Records an audit event for handlers annotated with @Audit() after they
 * complete successfully. Only the entity id (when present in the response) and
 * actor/tenant context are stored - never full request bodies, which may
 * contain sensitive data.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMetadata | undefined>(AUDIT_KEY, context.getHandler());
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return next.handle().pipe(
      tap((response) => {
        const entityId = this.extractId(response);
        void this.audit.record({
          organizationId: req.user?.activeOrganizationId ?? null,
          actorId: req.user?.userId ?? null,
          action: meta.action,
          entityType: meta.entityType,
          entityId,
          ipAddress: req.ip,
          userAgent: req.header('user-agent') ?? null,
          requestId: req.requestId ?? null,
        });
      }),
    );
  }

  private extractId(response: unknown): string | null {
    if (response && typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      if (typeof obj.id === 'string') return obj.id;
      if (obj.data && typeof obj.data === 'object') {
        const data = obj.data as Record<string, unknown>;
        if (typeof data.id === 'string') return data.id;
      }
    }
    return null;
  }
}
