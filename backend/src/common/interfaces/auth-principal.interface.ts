import type { Request } from 'express';

export interface MembershipPrincipal {
  membershipId: string;
  organizationId: string;
  schoolId: string | null;
  campusId: string | null;
  roleKey: string | null;
  status: string;
}

export interface AuthPrincipal {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
  permissions: Set<string>;
  memberships: MembershipPrincipal[];
  /** Organization context resolved for the current request, if any. */
  activeOrganizationId: string | null;
  activeSchoolId: string | null;
  activeCampusId: string | null;
  sessionId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPrincipal;
  requestId?: string;
}
