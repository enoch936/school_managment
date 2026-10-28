import { Test, TestingModule } from '@nestjs/testing';
import { TimetablesService } from './timetables.service';
import { PrismaService } from '../../database/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';

describe('TimetablesService', () => {
  let service: TimetablesService;
  let prisma: {
    school: { findFirst: jest.Mock; findMany: jest.Mock };
    timetableEntry: { findMany: jest.Mock; create: jest.Mock; findFirst: jest.Mock; delete: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      school: { findFirst: jest.fn(), findMany: jest.fn() },
      timetableEntry: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetablesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TimetablesService>(TimetablesService);
  });

  it('should reject invalid time range where start >= end', async () => {
    prisma.school.findFirst.mockResolvedValue({ id: 'sch-1' });

    await expect(
      service.createEntry('org-1', {
        schoolId: 'sch-1',
        academicYearId: 'yr-1',
        classId: 'cls-1',
        subjectId: 'sbj-1',
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '09:00',
      }),
    ).rejects.toThrow(DomainException);
  });

  it('should detect teacher collision during overlapping times', async () => {
    prisma.school.findFirst.mockResolvedValue({ id: 'sch-1' });
    prisma.timetableEntry.findMany.mockResolvedValue([
      {
        id: 'entry-existing',
        dayOfWeek: 1,
        startTime: '08:30',
        endTime: '09:30',
        classId: 'cls-other',
        teacherId: 'tch-1',
        class: { name: 'Grade 10B' },
        teacher: { firstName: 'John', lastName: 'Doe' },
        room: null,
      },
    ]);

    await expect(
      service.createEntry('org-1', {
        schoolId: 'sch-1',
        academicYearId: 'yr-1',
        classId: 'cls-1',
        subjectId: 'sbj-1',
        teacherId: 'tch-1',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
      }),
    ).rejects.toThrow(DomainException);
  });

  it('should successfully schedule when no conflicts exist', async () => {
    prisma.school.findFirst.mockResolvedValue({ id: 'sch-1' });
    prisma.timetableEntry.findMany.mockResolvedValue([]);
    prisma.timetableEntry.create.mockResolvedValue({
      id: 'entry-1',
      startTime: '08:30',
      endTime: '09:15',
    });

    const res = await service.createEntry('org-1', {
      schoolId: 'sch-1',
      academicYearId: 'yr-1',
      classId: 'cls-1',
      subjectId: 'sbj-1',
      dayOfWeek: 1,
      startTime: '08:30',
      endTime: '09:15',
    });

    expect(res.id).toBe('entry-1');
  });
});
