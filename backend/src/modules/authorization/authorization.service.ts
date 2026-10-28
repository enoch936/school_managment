import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import type { AuthPrincipal, MembershipPrincipal } from '../../common/interfaces/auth-principal.interface';

const PRINCIPAL_CACHE_TTL = 60;

interface CachedPrincipal {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
  isActive: boolean;
  permissions: string[];
  memberships: MembershipPrincipal[];
}

/**
 * Builds the server-authoritative authorization principal for a user.
 *
 * Permissions and memberships are always loaded from the database (cached for
 * a short TTL). Client-supplied roles, permissions, or organization ids are
 * never trusted; the active organization is validated against the user's
 * memberships before it is applied to a request.
 */
@Injectable()
export class AuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private cacheKey(userId: string): string {
    return `principal:${userId}`;
  }

  async invalidate(userId: string): Promise<void> {
    await this.cache.del(this.cacheKey(userId));
  }

  async invalidateByOrganization(organizationId: string): Promise<void> {
    // Role changes affect all members of the organization; drop their cached
    // principals by scanning the principal namespace and filtering. For very
    // large tenants this should be replaced by a version counter.
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId },
      select: { userId: true },
    });
    await Promise.all(memberships.map((m) => this.invalidate(m.userId)));
  }

  private async load(userId: string): Promise<CachedPrincipal | null> {
    const cached = await this.cache.get<CachedPrincipal>(this.cacheKey(userId));
    if (cached) return cached;

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        isPlatformAdmin: true,
        isActive: true,
        memberships: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            organizationId: true,
            schoolId: true,
            campusId: true,
            status: true,
            roleId: true,
          },
        },
        userRoles: {
          select: { roleId: true, schoolId: true, campusId: true },
        },
      },
    });

    if (!user) return null;

    // Collect role ids from memberships and explicit user roles.
    const roleIds = new Set<string>();
    user.memberships.forEach((m) => m.roleId && roleIds.add(m.roleId));
    user.userRoles.forEach((r) => roleIds.add(r.roleId));

    const rolePermissions = roleIds.size
      ? await this.prisma.rolePermission.findMany({
          where: { roleId: { in: [...roleIds] } },
          select: { permission: { select: { key: true } } },
        })
      : [];

    const roleKeys = roleIds.size
      ? await this.prisma.role.findMany({
          where: { id: { in: [...roleIds] } },
          select: { id: true, key: true },
        })
      : [];
    const roleKeyById = new Map(roleKeys.map((r) => [r.id, r.key]));

    const permissions = [
      ...new Set(rolePermissions.flatMap((rp) => rp.permission.key)),
    ];

    const memberships: MembershipPrincipal[] = user.memberships.map((m) => ({
      membershipId: m.id,
      organizationId: m.organizationId,
      schoolId: m.schoolId,
      campusId: m.campusId,
      roleKey: m.roleId ? (roleKeyById.get(m.roleId) ?? null) : null,
      status: m.status,
    }));

    const principal: CachedPrincipal = {
      userId: user.id,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
      isActive: user.isActive,
      permissions,
      memberships,
    };

    await this.cache.set(this.cacheKey(userId), principal, PRINCIPAL_CACHE_TTL);
    return principal;
  }

  async buildPrincipal(
    userId: string,
    requestedOrganizationId?: string | null,
    requestedSchoolId?: string | null,
    requestedCampusId?: string | null,
    requestedAcademicYearId?: string | null,
    sessionId?: string | null,
  ): Promise<AuthPrincipal> {
    const cached = await this.load(userId);
    if (!cached) throw new UnauthorizedException('Account not found');
    if (!cached.isActive) throw new UnauthorizedException('Account is not active');

    const isPlatformAdmin = cached.isPlatformAdmin;
    const permissions = new Set(cached.permissions);

    let active = null as MembershipPrincipal | null;
    if (requestedOrganizationId) {
      active =
        cached.memberships.find((m) => m.organizationId === requestedOrganizationId) ?? null;
      if (!active && !isPlatformAdmin) {
        throw new UnauthorizedException('You are not a member of the requested organization');
      }
    } else {
      active = cached.memberships[0] ?? null;
    }

    const orgId = active?.organizationId ?? null;
    let resolvedSchoolId = active?.schoolId ?? null;
    let resolvedCampusId = active?.campusId ?? null;
    let resolvedAcademicYearId: string | null = null;
    let resolvedYearStatus: 'ACTIVE' | 'UPCOMING' | 'CLOSED' | 'ARCHIVED' | null = null;

    if (orgId) {
      // 1. Resolve and validate School
      if (requestedSchoolId) {
        const school = await this.prisma.school.findFirst({
          where: { id: requestedSchoolId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (school) {
          // If the user's membership restricts them to a specific school, ensure it matches
          if (active?.schoolId && active.schoolId !== requestedSchoolId && !isPlatformAdmin) {
            throw new UnauthorizedException('You do not have authorization for the requested school');
          }
          resolvedSchoolId = school.id;
        }
      } else if (!resolvedSchoolId) {
        // Default to the first school in the organization if membership has no specific school
        const defaultSchool = await this.prisma.school.findFirst({
          where: { organizationId: orgId, deletedAt: null },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        });
        if (defaultSchool) {
          resolvedSchoolId = defaultSchool.id;
        }
      }

      // 2. Resolve and validate Campus
      if (resolvedSchoolId && requestedCampusId) {
        const campus = await this.prisma.campus.findFirst({
          where: { id: requestedCampusId, schoolId: resolvedSchoolId, deletedAt: null },
          select: { id: true },
        });
        if (campus) {
          if (active?.campusId && active.campusId !== requestedCampusId && !isPlatformAdmin) {
            throw new UnauthorizedException('You do not have authorization for the requested campus');
          }
          resolvedCampusId = campus.id;
        }
      }

      // 3. Resolve and validate Academic Year
      if (resolvedSchoolId) {
        if (requestedAcademicYearId) {
          const year = await this.prisma.academicYear.findFirst({
            where: { id: requestedAcademicYearId, schoolId: resolvedSchoolId },
            select: { id: true, isCurrent: true, startDate: true, endDate: true },
          });
          if (year) {
            resolvedAcademicYearId = year.id;
            const now = new Date();
            if (year.endDate < now) {
              resolvedYearStatus = 'CLOSED';
            } else if (year.startDate > now) {
              resolvedYearStatus = 'UPCOMING';
            } else {
              resolvedYearStatus = year.isCurrent ? 'ACTIVE' : 'CLOSED';
            }
          }
        }

        // If no academic year requested or not found, fall back to current active year
        if (!resolvedAcademicYearId) {
          const currentYear = await this.prisma.academicYear.findFirst({
            where: { schoolId: resolvedSchoolId, isCurrent: true },
            select: { id: true, startDate: true, endDate: true },
          });
          if (currentYear) {
            resolvedAcademicYearId = currentYear.id;
            resolvedYearStatus = 'ACTIVE';
          }
        }
      }
    }

    return {
      userId: cached.userId,
      email: cached.email,
      isPlatformAdmin,
      permissions,
      memberships: cached.memberships,
      activeOrganizationId: orgId,
      activeSchoolId: resolvedSchoolId,
      activeCampusId: resolvedCampusId,
      activeAcademicYearId: resolvedAcademicYearId,
      activeAcademicYearStatus: resolvedYearStatus,
      activeRoleKey: active?.roleKey ?? (isPlatformAdmin ? 'platform_super_admin' : null),
      sessionId: sessionId ?? null,
    };
  }
}
