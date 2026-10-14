import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'auditAction';

export interface AuditMetadata {
  action: string;
  entityType: string;
}

/** Marks a route so the AuditInterceptor records a successful mutation. */
export const Audit = (action: string, entityType: string) =>
  SetMetadata(AUDIT_KEY, { action, entityType } satisfies AuditMetadata);
