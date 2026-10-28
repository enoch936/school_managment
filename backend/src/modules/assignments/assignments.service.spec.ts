import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsService } from './assignments.service';
import { PrismaService } from '../../database/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let prisma: {
    school: { findFirst: jest.Mock; findMany: jest.Mock };
    assignment: { findFirst: jest.Mock; create: jest.Mock; findMany: jest.Mock; count: jest.Mock; update: jest.Mock };
    submission: { upsert: jest.Mock; findFirst: jest.Mock; update: jest.Mock; findMany: jest.Mock };
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: PrismaService, useValue: prisma },
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
    });

    await expect(
      service.gradeSubmission('org-1', 'asg-1', 'sub-1', 'grader-1', {
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
      service.submit('org-1', 'asg-1', {
        studentId: 'std-1',
        content: 'My assignment submission',
      }),
    ).rejects.toThrow(DomainException);
  });
});
