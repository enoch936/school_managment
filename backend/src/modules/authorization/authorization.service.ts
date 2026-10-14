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

    return {
      userId: cached.userId,
      email: cached.email,
      isPlatformAdmin,
      permissions,
      memberships: cached.memberships,
      activeOrganizationId: active?.organizationId ?? null,
      activeSchoolId: active?.schoolId ?? null,
      activeCampusId: active?.campusId ?? null,
      sessionId: sessionId ?? null,
    };
  }
}
