import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from '../../database/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: {
    school: { findFirst: jest.Mock; findMany: jest.Mock };
    staff: { findUnique: jest.Mock; create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    teacher: { findUnique: jest.Mock; create: jest.Mock; findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock };
    teacherAssignment: { upsert: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      school: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      staff: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      teacher: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      teacherAssignment: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  it('should prevent creating a teacher if school does not belong to organization', async () => {
    prisma.school.findFirst.mockResolvedValue(null);

    await expect(
      service.createTeacher('org-1', {
        schoolId: 'sch-invalid',
        employeeCode: 'TCH-001',
        firstName: 'Abebe',
        lastName: 'Bikila',
      }),
    ).rejects.toThrow(DomainException);
  });

  it('should successfully create teacher when valid', async () => {
    prisma.school.findFirst.mockResolvedValue({ id: 'sch-1' });
    prisma.teacher.findUnique.mockResolvedValue(null);
    prisma.teacher.create.mockResolvedValue({
      id: 'tch-1',
      schoolId: 'sch-1',
      employeeCode: 'TCH-001',
      firstName: 'Abebe',
      lastName: 'Bikila',
    });

    const result = await service.createTeacher('org-1', {
      schoolId: 'sch-1',
      employeeCode: 'TCH-001',
      firstName: 'Abebe',
      lastName: 'Bikila',
    });

    expect(result.id).toBe('tch-1');
    expect(prisma.teacher.create).toHaveBeenCalled();
  });
});
