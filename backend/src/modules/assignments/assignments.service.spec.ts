import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsService } from './assignments.service';
import { PrismaService } from '../../database/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import { ResourceAuthorizationService } from '../authorization/resource-authorization.service';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let prisma: {
    school: { findFirst: jest.Mock; findMany: jest.Mock };
    assignment: { findFirst: jest.Mock; create: jest.Mock; findMany: jest.Mock; count: jest.Mock; update: jest.Mock };
    submission: { upsert: jest.Mock; findFirst: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  };
  let resourceAuth: {
    assertSchoolScope: jest.Mock;
    assertCampusScope: jest.Mock;
    assertCanAccessStudent: jest.Mock;
    assertTeacherAssignment: jest.Mock;
    assertAcademicYearMutable: jest.Mock;
    assertRecordStateMutable: jest.Mock;
  };

  const mockPrincipal: AuthPrincipal = {
    userId: 'user-1',
    email: 'teacher@example.com',
    isPlatformAdmin: false,
    permissions: new Set(['assignment:manage']),
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
    sessionId: null,
  };

  beforeEach(async () => {
    prisma = {
      school: { findFirst: jest.fn(), findMany: jest.fn() },
      assignment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      submission: {
        upsert: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };

    resourceAuth = {
      assertSchoolScope: jest.fn().mockResolvedValue(undefined),
      assertCampusScope: jest.fn(),
      assertCanAccessStudent: jest.fn().mockResolvedValue(undefined),
      assertTeacherAssignment: jest.fn().mockResolvedValue(undefined),
      assertAcademicYearMutable: jest.fn().mockResolvedValue(undefined),
      assertRecordStateMutable: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ResourceAuthorizationService, useValue: resourceAuth },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
  });

  it('should prevent grading score exceeding maxScore', async () => {
    prisma.school.findMany.mockResolvedValue([{ id: 'sch-1' }]);
    prisma.assignment.findFirst.mockResolvedValue({
      id: 'asg-1',
      maxScore: 50,
      schoolId: 'sch-1',
      classId: 'cls-1',
      subjectId: 'sub-1',
    });

    await expect(
      service.gradeSubmission(mockPrincipal, 'asg-1', 'sub-1', {
        score: 60,
        feedback: 'Good work',
      }),
    ).rejects.toThrow(DomainException);
  });

  it('should prevent late submissions when allowLate is false', async () => {
    prisma.school.findMany.mockResolvedValue([{ id: 'sch-1' }]);
    prisma.assignment.findFirst.mockResolvedValue({
      id: 'asg-1',
      dueAt: new Date(Date.now() - 3600000), // 1 hour ago
      allowLate: false,
      schoolId: 'sch-1',
    });

    await expect(
      service.submit(mockPrincipal, 'asg-1', {
        studentId: 'std-1',
        content: 'My assignment submission',
      }),
    ).rejects.toThrow(DomainException);
  });
});
