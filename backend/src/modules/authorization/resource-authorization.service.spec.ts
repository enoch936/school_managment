import { Test, TestingModule } from '@nestjs/testing';
import { ResourceAuthorizationService } from './resource-authorization.service';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';

describe('ResourceAuthorizationService', () => {
  let service: ResourceAuthorizationService;
  let prisma: {
    school: { findFirst: jest.Mock };
    student: { findFirst: jest.Mock };
    guardian: { findUnique: jest.Mock };
    studentGuardian: { findUnique: jest.Mock };
    teacher: { findUnique: jest.Mock };
    auditEvent: { create: jest.Mock };
  };

  const createPrincipal = (overrides: Partial<AuthPrincipal> = {}): AuthPrincipal => ({
    userId: 'usr-1',
    email: 'user@example.com',
    isPlatformAdmin: false,
    permissions: new Set(['student:read']),
    memberships: [
      {
        membershipId: 'mem-1',
        organizationId: 'org-1',
        schoolId: 'sch-1',
        campusId: null,
        roleKey: 'teacher',
        status: 'ACTIVE',
      },
    ],
    activeOrganizationId: 'org-1',
    activeSchoolId: 'sch-1',
    activeCampusId: null,
    sessionId: 'sess-1',
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      school: { findFirst: jest.fn() },
      student: { findFirst: jest.fn() },
      guardian: { findUnique: jest.fn() },
      studentGuardian: { findUnique: jest.fn() },
      teacher: { findUnique: jest.fn() },
      auditEvent: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceAuthorizationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ResourceAuthorizationService>(ResourceAuthorizationService);
  });

  it('should prevent cross-tenant school access by changing schoolId parameter', async () => {
    prisma.school.findFirst.mockResolvedValue(null);

    const principal = createPrincipal();
    await expect(
      service.assertSchoolScope(principal, 'sch-attacker-target'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should enforce campus boundary when principal is bound to a campus', () => {
    const principal = createPrincipal({ activeCampusId: 'campus-north' });

    expect(() =>
      service.assertCampusScope(principal, 'campus-south'),
    ).toThrow(ForbiddenException);

    expect(() =>
      service.assertCampusScope(principal, 'campus-north'),
    ).not.toThrow();
  });

  it('should prevent parent from accessing non-linked student', async () => {
    const parentPrincipal = createPrincipal({
      userId: 'parent-user-id',
      memberships: [
        {
          membershipId: 'mem-p',
          organizationId: 'org-1',
          schoolId: 'sch-1',
          campusId: null,
          roleKey: 'parent',
          status: 'ACTIVE',
        },
      ],
    });

    prisma.student.findFirst.mockResolvedValue({
      id: 'std-victim',
      schoolId: 'sch-1',
      campusId: null,
      userId: 'std-user-id',
      school: { organizationId: 'org-1' },
      enrollments: [],
    });
    prisma.guardian.findUnique.mockResolvedValue({ id: 'guard-1' });
    prisma.studentGuardian.findUnique.mockResolvedValue(null); // Not linked!

    await expect(
      service.assertCanAccessStudent(parentPrincipal, 'std-victim'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should log audit event when platform admin accesses sensitive health record', async () => {
    const platformAdmin = createPrincipal({
      userId: 'superadmin-id',
      isPlatformAdmin: true,
      email: 'admin@example.com',
    });

    await service.assertCanAccessSensitiveRecord(platformAdmin, 'std-1', 'health');

    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'sensitive_record.platform_admin_access.health',
          actorId: 'superadmin-id',
          entityType: 'HealthRecord',
          entityId: 'std-1',
        }),
      }),
    );
  });
});
