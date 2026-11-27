import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service';
import { PrismaService } from '../../database/prisma.service';
import { ResourceAuthorizationService } from '../authorization/resource-authorization.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: any;
  let resourceAuth: any;

  const mockPrincipal: AuthPrincipal = {
    userId: 'user-admin-1',
    email: 'admin@school.org',
    isPlatformAdmin: false,
    permissions: new Set(['student:manage', 'student:read']),
    memberships: [
      {
        membershipId: 'mem-1',
        organizationId: 'org-1',
        schoolId: 'school-1',
        campusId: 'campus-1',
        roleKey: 'school_admin',
        status: 'ACTIVE',
      },
    ],
    activeOrganizationId: 'org-1',
    activeSchoolId: 'school-1',
    activeCampusId: 'campus-1',
    activeAcademicYearId: null,
    activeAcademicYearStatus: null,
    activeRoleKey: 'school_admin',
    sessionId: null,
  };

  beforeEach(async () => {
    prisma = {
      school: {
        findFirst: jest.fn(),
      },
      campus: {
        findFirst: jest.fn(),
      },
      student: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      enrollment: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      academicYear: {
        findFirst: jest.fn(),
      },
      class: {
        findFirst: jest.fn(),
      },
      studentGuardian: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      attendanceRecord: {
        updateMany: jest.fn(),
      },
      document: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      invoice: { updateMany: jest.fn() },
      submission: { updateMany: jest.fn() },
      disciplineCase: { updateMany: jest.fn() },
      healthRecord: { updateMany: jest.fn() },
      auditEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(prisma);
        }
        return Promise.all(cb);
      }),
    };

    resourceAuth = {
      assertSchoolScope: jest.fn().mockResolvedValue(true),
      assertCampusScope: jest.fn().mockReturnValue(true),
      assertCanAccessStudent: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ResourceAuthorizationService, useValue: resourceAuth },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  describe('create', () => {
    it('should create a student with full demographic details and auto-generated number', async () => {
      prisma.school.findFirst.mockResolvedValue({ id: 'school-1', code: 'SMS1' });
      prisma.student.count.mockResolvedValue(15);
      prisma.student.findFirst.mockResolvedValue(null); // No duplicates
      prisma.student.create.mockResolvedValue({
        id: 'stu-1',
        schoolId: 'school-1',
        studentNumber: `STU-${new Date().getFullYear()}-0016`,
        firstName: 'Abebe',
        lastName: 'Bikila',
        nationalId: 'NAT-100200',
        bloodGroup: 'O+',
        status: 'APPLICANT',
      });

      const result = await service.create(mockPrincipal, {
        schoolId: 'school-1',
        firstName: 'Abebe',
        lastName: 'Bikila',
        nationalId: 'NAT-100200',
        bloodGroup: 'O+',
        emergencyContactName: 'Kebede Bikila',
        emergencyContactPhone: '+251911223344',
      });

      expect(result.id).toBe('stu-1');
      expect(result.firstName).toBe('Abebe');
      expect(prisma.student.create).toHaveBeenCalled();
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'student.create',
          }),
        }),
      );
    });

    it('should reject creation if duplicate student number exists', async () => {
      prisma.school.findFirst.mockResolvedValue({ id: 'school-1', code: 'SMS1' });
      prisma.student.findFirst.mockResolvedValueOnce({ id: 'stu-existing' });

      await expect(
        service.create(mockPrincipal, {
          schoolId: 'school-1',
          studentNumber: 'STU-DUPLICATE',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(DomainException);
    });

    it('should reject creation if duplicate national ID exists', async () => {
      prisma.school.findFirst.mockResolvedValue({ id: 'school-1', code: 'SMS1' });
      prisma.student.findFirst
        .mockResolvedValueOnce(null) // student number check passes
        .mockResolvedValueOnce({ id: 'stu-nat-dup' }); // national ID check fails

      await expect(
        service.create(mockPrincipal, {
          schoolId: 'school-1',
          studentNumber: 'STU-NEW',
          firstName: 'John',
          lastName: 'Doe',
          nationalId: 'NAT-EXISTING',
        }),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('enroll', () => {
    it('should enroll a student into an academic year and class and set status ACTIVE', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 'stu-1', schoolId: 'school-1', studentNumber: 'STU-1' });
      prisma.academicYear.findFirst.mockResolvedValue({ id: 'ay-2026' });
      prisma.class.findFirst.mockResolvedValue({ id: 'cls-10a' });
      prisma.enrollment.findUnique.mockResolvedValue(null);
      prisma.enrollment.create.mockResolvedValue({
        id: 'enr-1',
        studentId: 'stu-1',
        classId: 'cls-10a',
        academicYearId: 'ay-2026',
        status: 'ACTIVE',
      });

      const result = await service.enroll(mockPrincipal, 'stu-1', {
        academicYearId: 'ay-2026',
        classId: 'cls-10a',
        rollNumber: 12,
      });

      expect(result.id).toBe('enr-1');
      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'stu-1' },
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'student.enroll' }),
        }),
      );
    });
  });

  describe('transfer', () => {
    it('should transfer student to another campus and log audit event', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 'stu-1', schoolId: 'school-1', campusId: 'camp-1' });
      prisma.campus.findFirst.mockResolvedValue({ id: 'camp-2', name: 'Branch Campus' });
      prisma.student.update.mockResolvedValue({ id: 'stu-1', campusId: 'camp-2', status: 'ACTIVE' });

      const result = await service.transfer(mockPrincipal, 'stu-1', {
        targetCampusId: 'camp-2',
        transferReason: 'Relocation to branch campus',
      });

      expect(result.campusId).toBe('camp-2');
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'student.transfer' }),
        }),
      );
    });

    it('should record external transfer and mark status TRANSFERRED', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 'stu-1', schoolId: 'school-1', campusId: 'camp-1' });
      prisma.student.update.mockResolvedValue({ id: 'stu-1', status: 'TRANSFERRED' });

      const result = await service.transfer(mockPrincipal, 'stu-1', {
        externalSchoolName: 'St. George Academy',
        transferReason: 'Family moved abroad',
      });

      expect(result.status).toBe('TRANSFERRED');
    });
  });

  describe('promote', () => {
    it('should promote student by closing existing enrollment and creating new one', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 'stu-1', schoolId: 'school-1' });
      prisma.enrollment.findUnique.mockResolvedValue(null);
      prisma.enrollment.create.mockResolvedValue({
        id: 'enr-next',
        studentId: 'stu-1',
        classId: 'cls-11',
        academicYearId: 'ay-2027',
        status: 'ACTIVE',
      });

      const result = await service.promote(mockPrincipal, 'stu-1', {
        targetAcademicYearId: 'ay-2027',
        targetClassId: 'cls-11',
      });

      expect(prisma.enrollment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 'stu-1', status: 'ACTIVE' },
          data: expect.objectContaining({ status: 'PROMOTED' }),
        }),
      );
      expect(result.id).toBe('enr-next');
    });
  });

  describe('withdraw and graduate', () => {
    it('should withdraw student with reason and date', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 'stu-1', schoolId: 'school-1' });
      prisma.student.update.mockResolvedValue({ id: 'stu-1', status: 'WITHDRAWN' });

      const result = await service.withdraw(mockPrincipal, 'stu-1', {
        withdrawalReason: 'Personal reasons',
      });

      expect(result.status).toBe('WITHDRAWN');
      expect(prisma.enrollment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 'stu-1', status: 'ACTIVE' },
          data: expect.objectContaining({ status: 'WITHDRAWN' }),
        }),
      );
    });

    it('should graduate student with honors and completion date', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 'stu-1', schoolId: 'school-1' });
      prisma.student.update.mockResolvedValue({ id: 'stu-1', status: 'GRADUATED' });

      const result = await service.graduate(mockPrincipal, 'stu-1', {
        honors: 'Valedictorian',
      });

      expect(result.status).toBe('GRADUATED');
      expect(prisma.enrollment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 'stu-1', status: 'ACTIVE' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });
  });

  describe('detectDuplicates and merge', () => {
    it('should detect duplicate clusters based on matching national ID or DOB', async () => {
      prisma.student.findMany.mockResolvedValue([
        {
          id: 'stu-1',
          schoolId: 'school-1',
          studentNumber: 'STU-001',
          firstName: 'Sara',
          lastName: 'Tesfaye',
          nationalId: 'NAT-999',
          dateOfBirth: new Date('2012-05-10'),
          phone: '+251911111111',
          email: 'sara@test.com',
          status: 'ACTIVE',
        },
        {
          id: 'stu-2',
          schoolId: 'school-1',
          studentNumber: 'STU-002',
          firstName: 'Sara',
          lastName: 'Tesfaye',
          nationalId: 'NAT-999',
          dateOfBirth: new Date('2012-05-10'),
          phone: '+251922222222',
          email: 'sara2@test.com',
          status: 'APPLICANT',
        },
      ]);

      const duplicates = await service.detectDuplicates(mockPrincipal, 'school-1');
      expect(duplicates.length).toBeGreaterThan(0);
      expect(duplicates[0].confidence).toBe(100);
      expect(duplicates[0].matchType).toBe('EXACT_NATIONAL_ID');
    });

    it('should merge source student into target and re-link relations', async () => {
      prisma.student.findFirst
        .mockResolvedValueOnce({
          id: 'source-1',
          schoolId: 'school-1',
          studentNumber: 'STU-DUP',
          firstName: 'Sara',
          lastName: 'Tesfaye',
          bloodGroup: 'B+',
        })
        .mockResolvedValueOnce({
          id: 'target-1',
          schoolId: 'school-1',
          studentNumber: 'STU-PRIMARY',
          firstName: 'Sara',
          lastName: 'Tesfaye',
          bloodGroup: null,
        });

      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.studentGuardian.findMany.mockResolvedValue([]);
      prisma.student.update
        .mockResolvedValueOnce({ id: 'target-1' })
        .mockResolvedValueOnce({ id: 'source-1', status: 'WITHDRAWN' });

      const result = await service.merge(mockPrincipal, {
        sourceStudentId: 'source-1',
        targetStudentId: 'target-1',
        notes: 'Confirmed identical student registered twice',
      });

      expect(result.message).toContain('successfully merged');
      expect(prisma.attendanceRecord.updateMany).toHaveBeenCalledWith({
        where: { studentId: 'source-1' },
        data: { studentId: 'target-1' },
      });
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'student.merge' }),
        }),
      );
    });
  });

  describe('generateIdCard', () => {
    it('should generate a standardized scannable student ID card', async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: 'stu-1',
        schoolId: 'school-1',
        studentNumber: 'STU-2026-0001',
        firstName: 'Dawit',
        middleName: 'Mulugeta',
        lastName: 'Alemu',
        dateOfBirth: new Date('2014-04-12'),
        bloodGroup: 'AB+',
        photoUrl: 'https://cdn.school.org/photo.jpg',
        emergencyContactName: 'Mulugeta Alemu',
        emergencyContactPhone: '+251911000000',
        school: {
          id: 'school-1',
          name: 'St. Paul Academy',
          code: 'SPA',
          logoUrl: 'https://cdn.school.org/logo.png',
        },
        campus: { name: 'Main Campus' },
        enrollments: [
          {
            class: { name: 'Grade 5' },
            section: { name: 'Section B' },
            academicYear: { name: '2026-2027', endDate: new Date('2027-06-30') },
          },
        ],
      });

      const card = await service.generateIdCard(mockPrincipal, 'stu-1');
      expect(card.studentNumber).toBe('STU-2026-0001');
      expect(card.fullName).toBe('Dawit Mulugeta Alemu');
      expect(card.barcodePayload).toContain('SPA');
      expect(card.bloodGroup).toBe('AB+');
      expect(card.className).toBe('Grade 5');
    });
  });

  describe('bulkImport', () => {
    it('should import valid student rows and report errors on invalid rows', async () => {
      prisma.school.findFirst.mockResolvedValue({ id: 'school-1', code: 'SMS1' });
      prisma.student.count.mockResolvedValue(10);
      prisma.student.findFirst.mockResolvedValue(null);
      prisma.student.create.mockResolvedValue({ id: 'stu-imported' });

      const result = await service.bulkImport(mockPrincipal, {
        schoolId: 'school-1',
        students: [
          {
            firstName: 'Almaz',
            lastName: 'Ayana',
            email: 'almaz@test.com',
          },
          {
            firstName: '', // Invalid row: missing firstName
            lastName: 'Bekele',
          },
        ],
      });

      expect(result.total).toBe(2);
      expect(result.importedCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].row).toBe(2);
    });
  });
});
