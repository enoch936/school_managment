import { Test, TestingModule } from '@nestjs/testing';
import { DisciplineHealthService } from './discipline-health.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '../../common/exceptions/domain.exception';

describe('DisciplineHealthService', () => {
  let service: DisciplineHealthService;
  let prisma: {
    school: { findFirst: jest.Mock; findMany: jest.Mock };
    student: { findFirst: jest.Mock };
    disciplineCase: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    healthRecord: { findFirst: jest.Mock; upsert: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      school: { findFirst: jest.fn(), findMany: jest.fn() },
      student: { findFirst: jest.fn() },
      disciplineCase: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      healthRecord: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisciplineHealthService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DisciplineHealthService>(DisciplineHealthService);
  });

  it('should reject discipline case if student not found', async () => {
    prisma.school.findFirst.mockResolvedValue({ id: 'sch-1' });
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(
      service.createDisciplineCase('org-1', 'user-1', {
        schoolId: 'sch-1',
        studentId: 'std-unknown',
        incidentDate: '2026-05-10',
        category: 'Attendance',
        description: 'Skipped classes',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create discipline case when valid', async () => {
    prisma.school.findFirst.mockResolvedValue({ id: 'sch-1' });
    prisma.student.findFirst.mockResolvedValue({ id: 'std-1' });
    prisma.disciplineCase.create.mockResolvedValue({
      id: 'case-1',
      status: 'OPEN',
      category: 'Attendance',
    });

    const res = await service.createDisciplineCase('org-1', 'user-1', {
      schoolId: 'sch-1',
      studentId: 'std-1',
      incidentDate: '2026-05-10',
      category: 'Attendance',
      description: 'Skipped classes',
    });

    expect(res.id).toBe('case-1');
  });
});
