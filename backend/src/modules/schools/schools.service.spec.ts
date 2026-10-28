import { Test, TestingModule } from '@nestjs/testing';
import { SchoolsService } from './schools.service';
import { PrismaService } from '../../database/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let prisma: {
    school: { findFirst: jest.Mock; create: jest.Mock; findMany: jest.Mock; count: jest.Mock; update: jest.Mock };
    campus: { findFirst: jest.Mock; create: jest.Mock; findMany: jest.Mock; count: jest.Mock; update: jest.Mock };
    academicYear: { create: jest.Mock };
    term: { create: jest.Mock };
    gradingScale: { create: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    schoolPolicy: { createMany: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
    documentTemplate: { createMany: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
    subscription: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    featureFlag: { findMany: jest.Mock; upsert: jest.Mock };
    organization: { findUnique: jest.Mock; update: jest.Mock };
    student: { count: jest.Mock };
    staff: { count: jest.Mock };
    membership: { updateMany: jest.Mock };
    auditEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockPrincipal: AuthPrincipal = {
    userId: 'user-owner-1',
    email: 'owner@springfield.edu',
    isPlatformAdmin: false,
    permissions: new Set(['school:manage', 'campus:manage']),
    memberships: [
      {
        membershipId: 'mem-1',
        organizationId: 'org-1',
        schoolId: null,
        campusId: null,
        roleKey: 'school_owner',
        status: 'ACTIVE',
      },
    ],
    activeOrganizationId: 'org-1',
    activeSchoolId: null,
    activeCampusId: null,
    activeAcademicYearId: null,
    activeAcademicYearStatus: null,
    activeRoleKey: 'school_owner',
    sessionId: null,
  };

  beforeEach(async () => {
    prisma = {
      school: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
      campus: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
      academicYear: { create: jest.fn() },
      term: { create: jest.fn() },
      gradingScale: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      schoolPolicy: { createMany: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
      documentTemplate: { createMany: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      subscription: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      featureFlag: { findMany: jest.fn(), upsert: jest.fn() },
      organization: { findUnique: jest.fn(), update: jest.fn() },
      student: { count: jest.fn() },
      staff: { count: jest.fn() },
      membership: { updateMany: jest.fn() },
      auditEvent: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SchoolsService>(SchoolsService);
  });

  describe('onboardSchool', () => {
    it('should complete onboarding in a transaction creating school, campus, academic year, grading scale, and policies', async () => {
      prisma.school.findFirst.mockResolvedValue(null);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        plan: 'GROWTH',
        status: 'ACTIVE',
        campusLimit: 5,
        studentLimit: 2500,
      });

      const mockCreatedSchool = { id: 'sch-new', name: 'Springfield Academy', code: 'SP-ACAD' };
      const mockCreatedCampus = { id: 'cmp-main', name: 'Main Campus', code: 'MAIN' };
      const mockCreatedYear = { id: 'ay-2026', name: '2026-2027 Academic Year' };

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          school: { create: jest.fn().mockResolvedValue(mockCreatedSchool) },
          campus: { create: jest.fn().mockResolvedValue(mockCreatedCampus) },
          academicYear: { create: jest.fn().mockResolvedValue(mockCreatedYear) },
          term: { create: jest.fn().mockResolvedValue({ id: 't-1' }) },
          gradingScale: { create: jest.fn().mockResolvedValue({ id: 'gs-1' }) },
          schoolPolicy: { createMany: jest.fn().mockResolvedValue({ count: 3 }) },
          documentTemplate: { createMany: jest.fn().mockResolvedValue({ count: 4 }) },
          membership: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          auditEvent: { create: jest.fn().mockResolvedValue({ id: 'aud-1' }) },
        };
        return callback(tx);
      });

      const result = await service.onboardSchool('org-1', mockPrincipal, {
        name: 'Springfield Academy',
        code: 'SP-ACAD',
        mainCampusName: 'Main Campus',
        mainCampusCode: 'MAIN',
        academicYearName: '2026-2027 Academic Year',
        academicYearStartDate: '2026-09-01',
        academicYearEndDate: '2027-06-30',
        termNames: ['Semester 1', 'Semester 2'],
        timezone: 'Africa/Addis_Ababa',
        currency: 'ETB',
        locale: 'en',
      });

      expect(result.school.id).toBe('sch-new');
      expect(result.campus.id).toBe('cmp-main');
      expect(result.academicYear.id).toBe('ay-2026');
    });

    it('should reject onboarding if school code already exists in organization', async () => {
      prisma.school.findFirst.mockResolvedValue({ id: 'existing-sch', code: 'SP-ACAD' });

      await expect(
        service.onboardSchool('org-1', mockPrincipal, {
          name: 'Springfield Academy',
          code: 'SP-ACAD',
          mainCampusName: 'Main Campus',
          mainCampusCode: 'MAIN',
          academicYearName: '2026-2027 Academic Year',
          academicYearStartDate: '2026-09-01',
          academicYearEndDate: '2027-06-30',
          termNames: ['Semester 1'],
        }),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('createCampus', () => {
    it('should enforce campus quota limit from subscription', async () => {
      prisma.school.findFirst.mockResolvedValue({ id: 'sch-1', organizationId: 'org-1' });
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        plan: 'STARTER',
        status: 'ACTIVE',
        campusLimit: 2,
      });
      prisma.campus.count.mockResolvedValue(2); // Already reached 2 campuses!

      await expect(
        service.createCampus('org-1', {
          schoolId: 'sch-1',
          name: 'Third Branch Campus',
          code: 'BRANCH-3',
        }),
      ).rejects.toThrow(DomainException);
    });

    it('should allow campus creation when within subscription quota', async () => {
      prisma.school.findFirst.mockResolvedValue({ id: 'sch-1', organizationId: 'org-1' });
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        plan: 'GROWTH',
        status: 'ACTIVE',
        campusLimit: 5,
      });
      prisma.campus.count.mockResolvedValue(2);
      prisma.campus.findFirst.mockResolvedValue(null);
      prisma.campus.create.mockResolvedValue({ id: 'cmp-new', name: 'North Campus', code: 'NORTH' });

      const campus = await service.createCampus('org-1', {
        schoolId: 'sch-1',
        name: 'North Campus',
        code: 'NORTH',
      });

      expect(campus.id).toBe('cmp-new');
      expect(prisma.campus.create).toHaveBeenCalled();
    });
  });

  describe('gradingScales & policies', () => {
    it('should upsert school policy correctly', async () => {
      prisma.school.findFirst.mockResolvedValue({ id: 'sch-1', organizationId: 'org-1' });
      prisma.schoolPolicy.upsert.mockResolvedValue({
        id: 'pol-1',
        key: 'attendance.policy',
        value: { minPercentage: 80 },
      });

      const policy = await service.upsertSchoolPolicy('org-1', 'sch-1', {
        schoolId: 'sch-1',
        category: 'ATTENDANCE',
        key: 'attendance.policy',
        name: 'Attendance Rule',
        value: { minPercentage: 80 },
      });

      expect(policy.id).toBe('pol-1');
      expect(prisma.schoolPolicy.upsert).toHaveBeenCalled();
    });
  });

  describe('subscription & feature flags', () => {
    it('should return live usage percentages for tenant subscription', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        plan: 'GROWTH',
        status: 'ACTIVE',
        studentLimit: 1000,
        staffLimit: 100,
        campusLimit: 5,
      });

      prisma.student.count.mockResolvedValue(500); // 50%
      prisma.staff.count.mockResolvedValue(25);     // 25%
      prisma.campus.count.mockResolvedValue(2);    // 40%
      prisma.school.count.mockResolvedValue(1);

      const data = await service.getTenantSubscription('org-1');

      expect(data.subscription.plan).toBe('GROWTH');
      expect(data.usage.students.utilizationPercent).toBe(50);
      expect(data.usage.staff.utilizationPercent).toBe(25);
      expect(data.usage.campuses.utilizationPercent).toBe(40);
    });

    it('should toggle feature flag for tenant', async () => {
      prisma.featureFlag.upsert.mockResolvedValue({
        id: 'ff-1',
        key: 'feature.biometric_attendance',
        enabled: true,
      });

      const flag = await service.toggleFeatureFlag('org-1', {
        key: 'feature.biometric_attendance',
        enabled: true,
      });

      expect(flag.enabled).toBe(true);
      expect(prisma.featureFlag.upsert).toHaveBeenCalled();
    });
  });
});
