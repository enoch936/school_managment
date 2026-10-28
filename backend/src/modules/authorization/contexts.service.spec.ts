import { Test, TestingModule } from '@nestjs/testing';
import { ContextsService } from './contexts.service';
import { PrismaService } from '../../database/prisma.service';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';

describe('ContextsService', () => {
  let service: ContextsService;
  let prisma: {
    organization: { findMany: jest.Mock };
  };

  const mockPrincipal: AuthPrincipal = {
    userId: 'usr-1',
    email: 'principal@example.com',
    isPlatformAdmin: false,
    permissions: new Set(['school:read']),
    memberships: [
      {
        membershipId: 'mem-1',
        organizationId: 'org-1',
        schoolId: 'sch-1',
        campusId: 'cmp-1',
        roleKey: 'principal',
        status: 'ACTIVE',
      },
    ],
    activeOrganizationId: 'org-1',
    activeSchoolId: 'sch-1',
    activeCampusId: 'cmp-1',
    activeAcademicYearId: 'ay-1',
    activeAcademicYearStatus: 'ACTIVE',
    activeRoleKey: 'principal',
    sessionId: 'sess-1',
  };

  beforeEach(async () => {
    prisma = {
      organization: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ContextsService>(ContextsService);
  });

  it('should return accessible organizations, scoped schools, campuses, and academic years', async () => {
    const mockOrgs = [
      {
        id: 'org-1',
        name: 'Springfield Academy Org',
        slug: 'springfield',
        schools: [
          {
            id: 'sch-1',
            name: 'Springfield High',
            code: 'SP-HIGH',
            campuses: [
              { id: 'cmp-1', name: 'Main Campus', code: 'MAIN' },
              { id: 'cmp-2', name: 'West Campus', code: 'WEST' },
            ],
            academicYears: [
              {
                id: 'ay-1',
                name: '2026-2027',
                isCurrent: true,
                startDate: new Date('2026-09-01'),
                endDate: new Date('2027-06-30'),
              },
            ],
          },
          {
            id: 'sch-2',
            name: 'Springfield Elementary',
            code: 'SP-ELEM',
            campuses: [],
            academicYears: [],
          },
        ],
      },
    ];

    prisma.organization.findMany.mockResolvedValue(mockOrgs);

    const result = await service.getAvailableContexts(mockPrincipal);

    expect(result.organizations).toHaveLength(1);
    expect(result.organizations[0].name).toBe('Springfield Academy Org');
    // Because membership is scoped to sch-1 and cmp-1, sch-2 and cmp-2 must be filtered out for non-platform admin
    expect(result.organizations[0].schools).toHaveLength(1);
    expect(result.organizations[0].schools[0].id).toBe('sch-1');
    expect(result.organizations[0].schools[0].campuses).toHaveLength(1);
    expect(result.organizations[0].schools[0].campuses[0].id).toBe('cmp-1');
    expect(result.active.schoolId).toBe('sch-1');
    expect(result.active.campusId).toBe('cmp-1');
    expect(result.active.academicYearId).toBe('ay-1');
  });

  it('should return active context summary with effective permissions', () => {
    const active = service.getActiveContext(mockPrincipal);
    expect(active.organizationId).toBe('org-1');
    expect(active.schoolId).toBe('sch-1');
    expect(active.campusId).toBe('cmp-1');
    expect(active.roleKey).toBe('principal');
    expect(active.permissions).toContain('school:read');
  });
});
