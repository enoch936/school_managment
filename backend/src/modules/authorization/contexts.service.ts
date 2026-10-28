import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';

export interface AvailableContextResponse {
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    roleKey: string | null;
    schools: Array<{
      id: string;
      name: string;
      code: string;
      campuses: Array<{
        id: string;
        name: string;
        code: string;
      }>;
      academicYears: Array<{
        id: string;
        name: string;
        isCurrent: boolean;
        startDate: Date;
        endDate: Date;
        status: 'ACTIVE' | 'UPCOMING' | 'CLOSED';
      }>;
    }>;
  }>;
  active: {
    organizationId: string | null;
    schoolId: string | null;
    campusId: string | null;
    academicYearId: string | null;
    academicYearStatus: 'ACTIVE' | 'UPCOMING' | 'CLOSED' | 'ARCHIVED' | null;
    roleKey: string | null;
  };
}

@Injectable()
export class ContextsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableContexts(principal: AuthPrincipal): Promise<AvailableContextResponse> {
    const orgIds = [
      ...new Set(principal.memberships.map((m) => m.organizationId).filter(Boolean)),
    ];

    // Platform Super Admin can see all active organizations if desired
    const organizations = await this.prisma.organization.findMany({
      where: principal.isPlatformAdmin ? { deletedAt: null } : { id: { in: orgIds }, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        schools: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            code: true,
            campuses: {
              where: { deletedAt: null },
              select: { id: true, name: true, code: true },
            },
            academicYears: {
              select: {
                id: true,
                name: true,
                isCurrent: true,
                startDate: true,
                endDate: true,
              },
              orderBy: { startDate: 'desc' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const resultOrgs = organizations.map((org) => {
      const membership = principal.memberships.find((m) => m.organizationId === org.id);
      const roleKey = membership?.roleKey ?? (principal.isPlatformAdmin ? 'platform_super_admin' : null);

      // Filter schools if membership is explicitly scoped to a school
      let schools = org.schools;
      if (membership?.schoolId && !principal.isPlatformAdmin) {
        schools = schools.filter((s) => s.id === membership.schoolId);
      }

      const formattedSchools = schools.map((school) => {
        let campuses = school.campuses;
        if (membership?.campusId && !principal.isPlatformAdmin) {
          campuses = campuses.filter((c) => c.id === membership.campusId);
        }

        const formattedYears = school.academicYears.map((ay) => {
          let status: 'ACTIVE' | 'UPCOMING' | 'CLOSED' = 'ACTIVE';
          if (ay.endDate < now) {
            status = 'CLOSED';
          } else if (ay.startDate > now) {
            status = 'UPCOMING';
          } else {
            status = ay.isCurrent ? 'ACTIVE' : 'CLOSED';
          }

          return {
            id: ay.id,
            name: ay.name,
            isCurrent: ay.isCurrent,
            startDate: ay.startDate,
            endDate: ay.endDate,
            status,
          };
        });

        return {
          id: school.id,
          name: school.name,
          code: school.code,
          campuses: campuses.map((c) => ({ id: c.id, name: c.name, code: c.code })),
          academicYears: formattedYears,
        };
      });

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        roleKey,
        schools: formattedSchools,
      };
    });

    return {
      organizations: resultOrgs,
      active: {
        organizationId: principal.activeOrganizationId,
        schoolId: principal.activeSchoolId,
        campusId: principal.activeCampusId,
        academicYearId: principal.activeAcademicYearId,
        academicYearStatus: principal.activeAcademicYearStatus,
        roleKey: principal.activeRoleKey,
      },
    };
  }

  getActiveContext(principal: AuthPrincipal) {
    return {
      userId: principal.userId,
      email: principal.email,
      isPlatformAdmin: principal.isPlatformAdmin,
      organizationId: principal.activeOrganizationId,
      schoolId: principal.activeSchoolId,
      campusId: principal.activeCampusId,
      academicYearId: principal.activeAcademicYearId,
      academicYearStatus: principal.activeAcademicYearStatus,
      roleKey: principal.activeRoleKey,
      permissions: [...principal.permissions],
    };
  }
}
