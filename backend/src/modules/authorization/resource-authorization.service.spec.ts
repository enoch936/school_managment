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
    teacherAssignment: { findFirst: jest.Mock };
    academicYear: { findFirst: jest.Mock };
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
    activeAcademicYearId: 'ay-1',
    activeAcademicYearStatus: 'ACTIVE',
    activeRoleKey: 'teacher',
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
      teacherAssignment: { findFirst: jest.fn() },
      academicYear: { findFirst: jest.fn() },
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

  it('should reject teacher assignment when teacher is not assigned to class', async () => {
    const teacherPrincipal = createPrincipal({
      userId: 'teacher-user-1',
      memberships: [
        {
          membershipId: 'mem-t',
          organizationId: 'org-1',
          schoolId: 'sch-1',
          campusId: null,
          roleKey: 'teacher',
          status: 'ACTIVE',
        },
      ],
    });

    prisma.teacher.findUnique.mockResolvedValue({ id: 'teacher-1' });
    prisma.teacherAssignment.findFirst.mockResolvedValue(null); // Not assigned!

    await expect(
      service.assertTeacherAssignment(teacherPrincipal, 'cls-unassigned'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow principal or school admin to bypass teacher class assignment check', async () => {
    const adminPrincipal = createPrincipal({
      userId: 'admin-user-1',
      memberships: [
        {
          membershipId: 'mem-a',
          organizationId: 'org-1',
          schoolId: 'sch-1',
          campusId: null,
          roleKey: 'principal',
          status: 'ACTIVE',
        },
      ],
    });

    await expect(
      service.assertTeacherAssignment(adminPrincipal, 'cls-any'),
    ).resolves.toBeUndefined();
  });

  it('should forbid modifications to closed or archived academic year without override permission', async () => {
    const teacherPrincipal = createPrincipal();
    prisma.academicYear.findFirst.mockResolvedValue({
      id: 'ay-closed',
      name: '2023-2024',
      isCurrent: false,
      endDate: new Date('2024-06-30'),
    });

    await expect(
      service.assertAcademicYearMutable(teacherPrincipal, 'ay-closed', 'sch-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should forbid changing grades on published exam without administrative permissions', () => {
    const teacherPrincipal = createPrincipal();
    expect(() =>
      service.assertRecordStateMutable('Exam', 'PUBLISHED', 'recordGrade', teacherPrincipal),
    ).toThrow(ForbiddenException);
  });

  it('should forbid modifying paid invoices', () => {
    const principal = createPrincipal();
    expect(() =>
      service.assertRecordStateMutable('Invoice', 'PAID', 'update', principal),
    ).toThrow(ForbiddenException);
  });
});
