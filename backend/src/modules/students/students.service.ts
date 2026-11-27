import { Injectable, HttpStatus } from '@nestjs/common';
import { DocumentType, Prisma, SensitivityLevel, type Student } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import {
  BulkImportStudentsDto,
  BulkPromoteStudentsDto,
  CreateStudentDto,
  EnrollStudentDto,
  GraduateStudentDto,
  LinkGuardianDto,
  MergeStudentsDto,
  PromoteStudentDto,
  StudentQueryDto,
  TransferStudentDto,
  UpdateStudentDto,
  UploadStudentDocumentDto,
  WithdrawStudentDto,
} from './dto/student.dto';
import { ResourceAuthorizationService } from '../authorization/resource-authorization.service';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';

export type DuplicateStudent = Pick<
  Student,
  | 'id'
  | 'schoolId'
  | 'studentNumber'
  | 'firstName'
  | 'lastName'
  | 'dateOfBirth'
  | 'phone'
  | 'email'
  | 'nationalId'
  | 'birthCertificateNo'
  | 'status'
  | 'createdAt'
>;

export interface DuplicateCluster {
  clusterKey: string;
  matchType: string;
  confidence: number;
  students: DuplicateStudent[];
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resourceAuth: ResourceAuthorizationService,
  ) {}

  private tenantScope(organizationId: string, schoolId?: string): Prisma.StudentWhereInput {
    return {
      deletedAt: null,
      school: { organizationId, ...(schoolId ? { id: schoolId } : {}) },
    };
  }

  private async assertSchoolInOrganization(schoolId: string, organizationId: string) {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId, organizationId, deletedAt: null },
      select: { id: true, code: true, name: true, logoUrl: true },
    });
    if (!school) {
      throw new DomainException(
        'INVALID_SCHOOL',
        'The selected school does not belong to your organization',
        HttpStatus.BAD_REQUEST,
      );
    }
    return school;
  }

  private async generateStudentNumber(schoolId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.student.count({
      where: { schoolId },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `STU-${year}-${seq}`;
  }

  async create(principal: AuthPrincipal, dto: CreateStudentDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertSchoolScope(principal, dto.schoolId);
    this.resourceAuth.assertCampusScope(principal, dto.campusId);
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    if (dto.campusId) {
      const campus = await this.prisma.campus.findFirst({
        where: { id: dto.campusId, schoolId: dto.schoolId },
        select: { id: true },
      });
      if (!campus) {
        throw new DomainException('INVALID_CAMPUS', 'Campus does not belong to the school');
      }
    }

    const studentNumber = dto.studentNumber?.trim()
      ? dto.studentNumber.trim()
      : await this.generateStudentNumber(dto.schoolId);

    const duplicate = await this.prisma.student.findFirst({
      where: { schoolId: dto.schoolId, studentNumber },
      select: { id: true },
    });
    if (duplicate) {
      throw new DomainException(
        'DUPLICATE_STUDENT_NUMBER',
        'A student with this number already exists at this school',
        HttpStatus.CONFLICT,
      );
    }

    if (dto.nationalId) {
      const nationalIdDup = await this.prisma.student.findFirst({
        where: { schoolId: dto.schoolId, nationalId: dto.nationalId, deletedAt: null },
        select: { id: true },
      });
      if (nationalIdDup) {
        throw new DomainException(
          'DUPLICATE_NATIONAL_ID',
          'A student with this national ID already exists at this school',
          HttpStatus.CONFLICT,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          schoolId: dto.schoolId,
          campusId: dto.campusId,
          studentNumber,
          firstName: dto.firstName.trim(),
          middleName: dto.middleName?.trim(),
          lastName: dto.lastName.trim(),
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          placeOfBirth: dto.placeOfBirth?.trim(),
          nationality: dto.nationality?.trim(),
          nationalId: dto.nationalId?.trim(),
          birthCertificateNo: dto.birthCertificateNo?.trim(),
          bloodGroup: dto.bloodGroup?.trim(),
          religion: dto.religion?.trim(),
          motherTongue: dto.motherTongue?.trim(),
          photoUrl: dto.photoUrl?.trim(),
          email: dto.email?.trim().toLowerCase(),
          phone: dto.phone?.trim(),
          address: dto.address?.trim(),
          status: dto.status ?? 'APPLICANT',
          emergencyContactName: dto.emergencyContactName?.trim(),
          emergencyContactRelation: dto.emergencyContactRelation?.trim(),
          emergencyContactPhone: dto.emergencyContactPhone?.trim(),
          emergencyContactSecondaryPhone: dto.emergencyContactSecondaryPhone?.trim(),
          medicalNotes: dto.medicalNotes?.trim(),
          previousSchool: dto.previousSchool?.trim(),
          previousSchoolAddress: dto.previousSchoolAddress?.trim(),
          previousSchoolGrade: dto.previousSchoolGrade?.trim(),
          enrollmentDate: dto.enrollmentDate ? new Date(dto.enrollmentDate) : undefined,
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: principal.userId,
          action: 'student.create',
          entityType: 'Student',
          entityId: student.id,
          after: { studentNumber: student.studentNumber, name: `${student.firstName} ${student.lastName}`, schoolId: dto.schoolId },
        },
      });

      return student;
    });
  }

  async findAll(principal: AuthPrincipal, query: StudentQueryDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    const roles = new Set(principal.memberships.map((m) => m.roleKey));
    const isParent = roles.has('parent');
    const isStudent = roles.has('student');
    const isTeacher = roles.has('teacher') || roles.has('assistant_teacher');
    const isAdmin =
      principal.isPlatformAdmin ||
      roles.has('school_owner') ||
      roles.has('school_admin') ||
      roles.has('principal') ||
      roles.has('vice_principal') ||
      roles.has('registrar') ||
      roles.has('admissions_officer');

    const effectiveSchoolId = query.schoolId ?? principal.activeSchoolId ?? undefined;
    const effectiveCampusId = query.campusId ?? principal.activeCampusId ?? undefined;

    const where: Prisma.StudentWhereInput = {
      ...this.tenantScope(organizationId, effectiveSchoolId),
      ...(effectiveCampusId ? { campusId: effectiveCampusId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.gender ? { gender: query.gender } : {}),
      ...(query.bloodGroup ? { bloodGroup: query.bloodGroup } : {}),
      ...(query.classId || query.sectionId || query.academicYearId
        ? {
            enrollments: {
              some: {
                ...(query.classId ? { classId: query.classId } : {}),
                ...(query.sectionId ? { sectionId: query.sectionId } : {}),
                ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
                status: 'ACTIVE',
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { middleName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { studentNumber: { contains: query.search, mode: 'insensitive' } },
              { nationalId: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (isParent && !isAdmin) {
      const guardian = await this.prisma.guardian.findUnique({
        where: { userId: principal.userId },
        select: { id: true },
      });
      if (!guardian) {
        return paginate([], 0, query.page, query.pageSize);
      }
      where.guardians = { some: { guardianId: guardian.id } };
    } else if (isStudent && !isAdmin) {
      where.userId = principal.userId;
    } else if (isTeacher && !isAdmin) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: principal.userId },
        include: { assignments: true },
      });
      if (teacher && teacher.assignments.length > 0) {
        const assignedClassIds = teacher.assignments.map((a) => a.classId);
        where.enrollments = { some: { classId: { in: assignedClassIds }, status: 'ACTIVE' } };
      }
    }

    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.take,
        include: {
          campus: { select: { id: true, name: true, code: true } },
          enrollments: {
            where: { status: 'ACTIVE' },
            take: 1,
            include: {
              class: { select: { id: true, name: true } },
              section: { select: { id: true, name: true } },
              academicYear: { select: { id: true, name: true, isCurrent: true } },
            },
          },
          guardians: {
            include: {
              guardian: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
            },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(principal: AuthPrincipal, id: string) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, id);

    const student = await this.prisma.student.findFirst({
      where: { id, ...this.tenantScope(organizationId) },
      include: {
        school: { select: { id: true, name: true, code: true, logoUrl: true, email: true, phone: true } },
        campus: { select: { id: true, name: true, code: true, address: true, phone: true } },
        guardians: {
          include: {
            guardian: true,
          },
        },
        enrollments: {
          orderBy: { enrolledAt: 'desc' },
          include: {
            class: true,
            section: true,
            academicYear: true,
          },
        },
        documents: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        attendanceRecords: {
          take: 30,
          orderBy: { date: 'desc' },
          select: { id: true, date: true, status: true, minutesLate: true },
        },
      },
    });

    if (!student) throw new NotFoundException('Student', id);
    return student;
  }

  async update(principal: AuthPrincipal, id: string, dto: UpdateStudentDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, id);

    const existing = await this.prisma.student.findFirst({
      where: { id, ...this.tenantScope(organizationId) },
      select: { id: true, schoolId: true, campusId: true, studentNumber: true },
    });
    if (!existing) throw new NotFoundException('Student', id);

    if (dto.schoolId) {
      await this.resourceAuth.assertSchoolScope(principal, dto.schoolId);
      await this.assertSchoolInOrganization(dto.schoolId, organizationId);
    }
    if (dto.campusId) {
      this.resourceAuth.assertCampusScope(principal, dto.campusId);
    }

    if (dto.studentNumber && dto.studentNumber !== existing.studentNumber) {
      const duplicate = await this.prisma.student.findFirst({
        where: { schoolId: existing.schoolId, studentNumber: dto.studentNumber, id: { not: id } },
        select: { id: true },
      });
      if (duplicate) {
        throw new DomainException('DUPLICATE_STUDENT_NUMBER', 'Student number already in use', HttpStatus.CONFLICT);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id },
        data: {
          campusId: dto.campusId,
          studentNumber: dto.studentNumber,
          firstName: dto.firstName,
          middleName: dto.middleName,
          lastName: dto.lastName,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          placeOfBirth: dto.placeOfBirth,
          nationality: dto.nationality,
          nationalId: dto.nationalId,
          birthCertificateNo: dto.birthCertificateNo,
          bloodGroup: dto.bloodGroup,
          religion: dto.religion,
          motherTongue: dto.motherTongue,
          photoUrl: dto.photoUrl,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          status: dto.status,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactRelation: dto.emergencyContactRelation,
          emergencyContactPhone: dto.emergencyContactPhone,
          emergencyContactSecondaryPhone: dto.emergencyContactSecondaryPhone,
          medicalNotes: dto.medicalNotes,
          previousSchool: dto.previousSchool,
          previousSchoolAddress: dto.previousSchoolAddress,
          previousSchoolGrade: dto.previousSchoolGrade,
          enrollmentDate: dto.enrollmentDate ? new Date(dto.enrollmentDate) : undefined,
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: principal.userId,
          action: 'student.update',
          entityType: 'Student',
          entityId: id,
          after: { studentNumber: updated.studentNumber, status: updated.status, schoolId: existing.schoolId },
        },
      });

      return updated;
    });
  }

  async softDelete(organizationId: string, id: string) {
    const existing = await this.prisma.student.findFirst({
      where: { id, ...this.tenantScope(organizationId) },
      select: { id: true, schoolId: true },
    });
    if (!existing) throw new NotFoundException('Student', id);

    await this.prisma.student.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'WITHDRAWN' },
    });

    return { id };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle Workflows: Enroll, Transfer, Promote, Withdraw, Graduate
  // ---------------------------------------------------------------------------

  async enroll(principal: AuthPrincipal, studentId: string, dto: EnrollStudentDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, studentId);

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, ...this.tenantScope(organizationId) },
      select: { id: true, schoolId: true, studentNumber: true },
    });
    if (!student) throw new NotFoundException('Student', studentId);

    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, schoolId: student.schoolId },
      select: { id: true },
    });
    if (!academicYear) {
      throw new DomainException('INVALID_ACADEMIC_YEAR', 'Academic year not found for this school');
    }

    const classEntity = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId: student.schoolId },
      select: { id: true },
    });
    if (!classEntity) {
      throw new DomainException('INVALID_CLASS', 'Class not found for this school');
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_academicYearId: { studentId, academicYearId: dto.academicYearId } },
    });

    return this.prisma.$transaction(async (tx) => {
      let enrollment;
      if (existingEnrollment) {
        enrollment = await tx.enrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            classId: dto.classId,
            sectionId: dto.sectionId,
            rollNumber: dto.rollNumber,
            status: 'ACTIVE',
            notes: dto.notes,
          },
        });
      } else {
        enrollment = await tx.enrollment.create({
          data: {
            studentId,
            schoolId: student.schoolId,
            academicYearId: dto.academicYearId,
            classId: dto.classId,
            sectionId: dto.sectionId,
            rollNumber: dto.rollNumber,
            status: 'ACTIVE',
            enrolledAt: dto.enrolledAt ? new Date(dto.enrolledAt) : new Date(),
            notes: dto.notes,
          },
        });
      }

      await tx.student.update({
        where: { id: studentId },
        data: {
          status: 'ACTIVE',
          enrollmentDate: dto.enrolledAt ? new Date(dto.enrolledAt) : new Date(),
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: principal.userId,
          action: 'student.enroll',
          entityType: 'Enrollment',
          entityId: enrollment.id,
          after: { studentId, classId: dto.classId, academicYearId: dto.academicYearId, schoolId: student.schoolId },
        },
      });

      return enrollment;
    });
  }

  async transfer(principal: AuthPrincipal, studentId: string, dto: TransferStudentDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, studentId);

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, ...this.tenantScope(organizationId) },
      select: { id: true, schoolId: true, campusId: true },
    });
    if (!student) throw new NotFoundException('Student', studentId);

    if (dto.targetCampusId) {
      const targetCampus = await this.prisma.campus.findFirst({
        where: { id: dto.targetCampusId, schoolId: student.schoolId },
        select: { id: true, name: true },
      });
      if (!targetCampus) {
        throw new DomainException('INVALID_CAMPUS', 'Target campus not found in this school');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          campusId: dto.targetCampusId ?? student.campusId,
          transferReason: dto.transferReason,
          status: dto.externalSchoolName ? 'TRANSFERRED' : 'ACTIVE',
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: principal.userId,
          action: 'student.transfer',
          entityType: 'Student',
          entityId: studentId,
          after: {
            schoolId: student.schoolId,
            targetCampusId: dto.targetCampusId,
            externalSchool: dto.externalSchoolName,
            reason: dto.transferReason,
          },
        },
      });

      return updated;
    });
  }

  async promote(principal: AuthPrincipal, studentId: string, dto: PromoteStudentDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, studentId);

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, ...this.tenantScope(organizationId) },
      select: { id: true, schoolId: true },
    });
    if (!student) throw new NotFoundException('Student', studentId);

    return this.prisma.$transaction(async (tx) => {
      // Mark current active enrollment as PROMOTED
      await tx.enrollment.updateMany({
        where: { studentId, status: 'ACTIVE' },
        data: { status: 'PROMOTED', completedAt: new Date() },
      });

      // Upsert new enrollment
      const existing = await tx.enrollment.findUnique({
        where: {
          studentId_academicYearId: {
            studentId,
            academicYearId: dto.targetAcademicYearId,
          },
        },
      });

      let newEnrollment;
      if (existing) {
        newEnrollment = await tx.enrollment.update({
          where: { id: existing.id },
          data: {
            classId: dto.targetClassId,
            sectionId: dto.targetSectionId,
            status: 'ACTIVE',
            notes: dto.notes,
          },
        });
      } else {
        newEnrollment = await tx.enrollment.create({
          data: {
            studentId,
            schoolId: student.schoolId,
            academicYearId: dto.targetAcademicYearId,
            classId: dto.targetClassId,
            sectionId: dto.targetSectionId,
            status: 'ACTIVE',
            notes: dto.notes,
          },
        });
      }

      await tx.student.update({
        where: { id: studentId },
        data: { status: 'ACTIVE' },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: principal.userId,
          action: 'student.promote',
          entityType: 'Student',
          entityId: studentId,
          after: {
            schoolId: student.schoolId,
            targetAcademicYearId: dto.targetAcademicYearId,
            targetClassId: dto.targetClassId,
          },
        },
      });

      return newEnrollment;
    });
  }

  async bulkPromote(principal: AuthPrincipal, dto: BulkPromoteStudentsDto) {
    const results = [];
    for (const studentId of dto.studentIds) {
      const res = await this.promote(principal, studentId, {
        targetAcademicYearId: dto.targetAcademicYearId,
        targetClassId: dto.targetClassId,
        targetSectionId: dto.targetSectionId,
        notes: dto.notes,
      });
      results.push(res);
    }
    return {
      promotedCount: results.length,
      studentIds: dto.studentIds,
    };
  }

  async withdraw(principal: AuthPrincipal, studentId: string, dto: WithdrawStudentDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, studentId);

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, ...this.tenantScope(organizationId) },
      select: { id: true, schoolId: true },
    });
    if (!student) throw new NotFoundException('Student', studentId);

    const withdrawalDate = dto.withdrawalDate ? new Date(dto.withdrawalDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          status: 'WITHDRAWN',
          withdrawalReason: dto.withdrawalReason,
          withdrawalDate,
        },
      });

      await tx.enrollment.updateMany({
        where: { studentId, status: 'ACTIVE' },
        data: { status: 'WITHDRAWN', completedAt: withdrawalDate },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: principal.userId,
          action: 'student.withdraw',
          entityType: 'Student',
          entityId: studentId,
          after: { schoolId: student.schoolId, reason: dto.withdrawalReason, withdrawalDate },
        },
      });

      return updated;
    });
  }

  async graduate(principal: AuthPrincipal, studentId: string, dto: GraduateStudentDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, studentId);

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, ...this.tenantScope(organizationId) },
      select: { id: true, schoolId: true },
    });
    if (!student) throw new NotFoundException('Student', studentId);

    const graduationDate = dto.graduationDate ? new Date(dto.graduationDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          status: 'GRADUATED',
          graduationDate,
        },
      });

      await tx.enrollment.updateMany({
        where: { studentId, status: 'ACTIVE' },
        data: { status: 'COMPLETED', completedAt: graduationDate },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: principal.userId,
          action: 'student.graduate',
          entityType: 'Student',
          entityId: studentId,
          after: { schoolId: student.schoolId, graduationDate, honors: dto.honors },
        },
      });

      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // Authorized Photo & Document Uploads
  // ---------------------------------------------------------------------------

  async addDocument(principal: AuthPrincipal, studentId: string, dto: UploadStudentDocumentDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, studentId);

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, ...this.tenantScope(organizationId) },
      select: { id: true, schoolId: true },
    });
    if (!student) throw new NotFoundException('Student', studentId);

    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          schoolId: student.schoolId,
          studentId,
          type: dto.type,
          title: dto.title,
          storageKey: dto.storageKey,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          sensitivity: dto.sensitivity ?? SensitivityLevel.CONFIDENTIAL,
          uploadedById: principal.userId,
        },
      });

      if (dto.type === DocumentType.STUDENT_PHOTO) {
        await tx.student.update({
          where: { id: studentId },
          data: { photoUrl: dto.storageKey },
        });
      }

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: principal.userId,
          action: 'student.document_upload',
          entityType: 'Document',
          entityId: doc.id,
          after: { schoolId: student.schoolId, title: doc.title, type: doc.type },
        },
      });

      return doc;
    });
  }

  async listDocuments(principal: AuthPrincipal, studentId: string) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, studentId);

    return this.prisma.document.findMany({
      where: {
        studentId,
        deletedAt: null,
        school: { organizationId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeDocument(principal: AuthPrincipal, studentId: string, documentId: string) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, studentId);

    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, studentId, school: { organizationId } },
      select: { id: true },
    });
    if (!doc) throw new NotFoundException('Document', documentId);

    await this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });

    return { id: documentId };
  }

  // ---------------------------------------------------------------------------
  // Student ID Card Generation
  // ---------------------------------------------------------------------------

  async generateIdCard(principal: AuthPrincipal, studentId: string) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, studentId);

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, ...this.tenantScope(organizationId) },
      include: {
        school: { select: { id: true, name: true, code: true, logoUrl: true, address: true, phone: true } },
        campus: { select: { id: true, name: true, code: true } },
        enrollments: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: {
            class: true,
            section: true,
            academicYear: true,
          },
        },
      },
    });
    if (!student) throw new NotFoundException('Student', studentId);

    const activeEnrollment = student.enrollments[0];
    const expiryDate = activeEnrollment?.academicYear?.endDate ?? new Date(new Date().getFullYear(), 5, 30);

    return {
      cardId: `IDC-${student.studentNumber}`,
      studentNumber: student.studentNumber,
      fullName: `${student.firstName} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName}`,
      photoUrl: student.photoUrl,
      dateOfBirth: student.dateOfBirth,
      bloodGroup: student.bloodGroup ?? 'N/A',
      emergencyContactName: student.emergencyContactName,
      emergencyContactPhone: student.emergencyContactPhone,
      schoolName: student.school.name,
      schoolCode: student.school.code,
      schoolLogo: student.school.logoUrl,
      campusName: student.campus?.name ?? 'Main Campus',
      className: activeEnrollment?.class?.name ?? 'Unassigned',
      sectionName: activeEnrollment?.section?.name ?? '',
      academicYear: activeEnrollment?.academicYear?.name ?? `${new Date().getFullYear()}`,
      issuedAt: new Date().toISOString(),
      expiresAt: expiryDate.toISOString(),
      barcodePayload: `SMS:${student.school.code}:${student.studentNumber}`,
    };
  }

  // ---------------------------------------------------------------------------
  // Duplicate Detection & Controlled Record Merging
  // ---------------------------------------------------------------------------

  async detectDuplicates(principal: AuthPrincipal, schoolId?: string) {
    const organizationId = principal.activeOrganizationId ?? '';
    const effectiveSchoolId = schoolId ?? principal.activeSchoolId ?? undefined;

    const students = await this.prisma.student.findMany({
      where: {
        ...this.tenantScope(organizationId, effectiveSchoolId),
      },
      select: {
        id: true,
        schoolId: true,
        studentNumber: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        phone: true,
        email: true,
        nationalId: true,
        birthCertificateNo: true,
        status: true,
        createdAt: true,
      },
    });

    const clusters: DuplicateCluster[] = [];
    const paired = new Set<string>();

    for (let i = 0; i < students.length; i++) {
      for (let j = i + 1; j < students.length; j++) {
        const s1 = students[i];
        const s2 = students[j];
        if (s1.schoolId !== s2.schoolId) continue;

        const pairKey = [s1.id, s2.id].sort().join(':');
        if (paired.has(pairKey)) continue;

        let matchType: string | null = null;
        let confidence = 0;

        if (s1.nationalId && s2.nationalId && s1.nationalId === s2.nationalId) {
          matchType = 'EXACT_NATIONAL_ID';
          confidence = 100;
        } else if (
          s1.birthCertificateNo &&
          s2.birthCertificateNo &&
          s1.birthCertificateNo === s2.birthCertificateNo
        ) {
          matchType = 'EXACT_BIRTH_CERTIFICATE';
          confidence = 100;
        } else if (
          (s1.phone && s2.phone && s1.phone === s2.phone) ||
          (s1.email && s2.email && s1.email.toLowerCase() === s2.email.toLowerCase())
        ) {
          matchType = 'EXACT_CONTACT_INFO';
          confidence = 90;
        } else if (
          s1.firstName.toLowerCase() === s2.firstName.toLowerCase() &&
          s1.lastName.toLowerCase() === s2.lastName.toLowerCase() &&
          s1.dateOfBirth &&
          s2.dateOfBirth &&
          s1.dateOfBirth.toISOString().split('T')[0] === s2.dateOfBirth.toISOString().split('T')[0]
        ) {
          matchType = 'EXACT_NAME_AND_DOB';
          confidence = 85;
        } else if (
          s1.firstName.toLowerCase() === s2.firstName.toLowerCase() &&
          s1.lastName.toLowerCase() === s2.lastName.toLowerCase()
        ) {
          matchType = 'EXACT_NAME_DIFFERENT_DOB';
          confidence = 60;
        }

        if (matchType) {
          paired.add(pairKey);
          clusters.push({
            clusterKey: pairKey,
            matchType,
            confidence,
            students: [s1, s2],
          });
        }
      }
    }

    return clusters.sort((a, b) => b.confidence - a.confidence);
  }

  async merge(principal: AuthPrincipal, dto: MergeStudentsDto) {
    if (dto.sourceStudentId === dto.targetStudentId) {
      throw new DomainException('INVALID_MERGE', 'Source and target students must be different');
    }

    const organizationId = principal.activeOrganizationId ?? '';
    const [source, target] = await Promise.all([
      this.prisma.student.findFirst({
        where: { id: dto.sourceStudentId, ...this.tenantScope(organizationId) },
      }),
      this.prisma.student.findFirst({
        where: { id: dto.targetStudentId, ...this.tenantScope(organizationId) },
      }),
    ]);

    if (!source) throw new NotFoundException('Source Student', dto.sourceStudentId);
    if (!target) throw new NotFoundException('Target Student', dto.targetStudentId);

    if (source.schoolId !== target.schoolId) {
      throw new DomainException('SCHOOL_MISMATCH', 'Cannot merge students across different schools');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Re-link non-conflicting Enrollments
      const sourceEnrollments = await tx.enrollment.findMany({ where: { studentId: source.id } });
      for (const enr of sourceEnrollments) {
        const targetConflict = await tx.enrollment.findUnique({
          where: { studentId_academicYearId: { studentId: target.id, academicYearId: enr.academicYearId } },
        });
        if (!targetConflict) {
          await tx.enrollment.update({
            where: { id: enr.id },
            data: { studentId: target.id },
          });
        }
      }

      // 2. Re-link Guardians
      const sourceGuardians = await tx.studentGuardian.findMany({ where: { studentId: source.id } });
      for (const sg of sourceGuardians) {
        const targetConflict = await tx.studentGuardian.findUnique({
          where: { studentId_guardianId: { studentId: target.id, guardianId: sg.guardianId } },
        });
        if (!targetConflict) {
          await tx.studentGuardian.update({
            where: { id: sg.id },
            data: { studentId: target.id },
          });
        }
      }

      // 3. Re-link Attendance, Documents, Invoices, Submissions, Discipline, Health
      await tx.attendanceRecord.updateMany({ where: { studentId: source.id }, data: { studentId: target.id } });
      await tx.document.updateMany({ where: { studentId: source.id }, data: { studentId: target.id } });
      await tx.invoice.updateMany({ where: { studentId: source.id }, data: { studentId: target.id } });
      await tx.submission.updateMany({ where: { studentId: source.id }, data: { studentId: target.id } });
      await tx.disciplineCase.updateMany({ where: { studentId: source.id }, data: { studentId: target.id } });
      await tx.healthRecord.updateMany({ where: { studentId: source.id }, data: { studentId: target.id } });

      // 4. Backfill any missing demographic fields on target
      await tx.student.update({
        where: { id: target.id },
        data: {
          photoUrl: target.photoUrl ?? source.photoUrl,
          nationalId: target.nationalId ?? source.nationalId,
          birthCertificateNo: target.birthCertificateNo ?? source.birthCertificateNo,
          bloodGroup: target.bloodGroup ?? source.bloodGroup,
          religion: target.religion ?? source.religion,
          motherTongue: target.motherTongue ?? source.motherTongue,
          phone: target.phone ?? source.phone,
          email: target.email ?? source.email,
          emergencyContactName: target.emergencyContactName ?? source.emergencyContactName,
          emergencyContactPhone: target.emergencyContactPhone ?? source.emergencyContactPhone,
          medicalNotes: target.medicalNotes ?? source.medicalNotes,
          previousSchool: target.previousSchool ?? source.previousSchool,
        },
      });

      // 5. Soft-delete and archive source record
      const archivedSource = await tx.student.update({
        where: { id: source.id },
        data: {
          deletedAt: new Date(),
          status: 'WITHDRAWN',
          medicalNotes: [source.medicalNotes, `[MERGED_INTO:${target.studentNumber}] ${dto.notes ?? ''}`]
            .filter(Boolean)
            .join(' | '),
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: principal.userId,
          action: 'student.merge',
          entityType: 'Student',
          entityId: target.id,
          before: { sourceStudentId: source.id, sourceNumber: source.studentNumber },
          after: { targetStudentId: target.id, targetNumber: target.studentNumber, schoolId: target.schoolId, notes: dto.notes },
        },
      });

      return {
        message: 'Student records successfully merged',
        targetId: target.id,
        archivedSourceId: archivedSource.id,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Bulk Import & Export
  // ---------------------------------------------------------------------------

  async exportStudentsCsv(principal: AuthPrincipal, query: StudentQueryDto): Promise<string> {
    const fullQuery = Object.assign(new StudentQueryDto(), query, { page: 1, pageSize: 5000, skip: 0, take: 5000 });
    const listResult = await this.findAll(principal, fullQuery);
    const students = listResult.data as any[];

    const headers = [
      'StudentNumber',
      'FirstName',
      'MiddleName',
      'LastName',
      'Gender',
      'DateOfBirth',
      'NationalId',
      'BloodGroup',
      'Email',
      'Phone',
      'Address',
      'Status',
      'Campus',
      'Class',
      'EmergencyName',
      'EmergencyPhone',
      'PreviousSchool',
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    };

    const rows = students.map((s) => [
      escapeCsv(s.studentNumber),
      escapeCsv(s.firstName),
      escapeCsv(s.middleName),
      escapeCsv(s.lastName),
      escapeCsv(s.gender),
      escapeCsv(s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split('T')[0] : ''),
      escapeCsv(s.nationalId),
      escapeCsv(s.bloodGroup),
      escapeCsv(s.email),
      escapeCsv(s.phone),
      escapeCsv(s.address),
      escapeCsv(s.status),
      escapeCsv(s.campus?.name ?? ''),
      escapeCsv(s.enrollments?.[0]?.class?.name ?? ''),
      escapeCsv(s.emergencyContactName),
      escapeCsv(s.emergencyContactPhone),
      escapeCsv(s.previousSchool),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  async bulkImport(principal: AuthPrincipal, dto: BulkImportStudentsDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertSchoolScope(principal, dto.schoolId);
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    const imported: any[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let index = 0; index < dto.students.length; index++) {
      const row = dto.students[index];
      try {
        if (!row.firstName || !row.lastName) {
          throw new Error('First name and last name are required');
        }

        const student = await this.create(principal, {
          schoolId: dto.schoolId,
          campusId: dto.campusId,
          studentNumber: row.studentNumber,
          firstName: row.firstName,
          middleName: row.middleName,
          lastName: row.lastName,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          email: row.email,
          phone: row.phone,
          address: row.address,
          nationalId: row.nationalId,
          emergencyContactName: row.emergencyContactName,
          emergencyContactPhone: row.emergencyContactPhone,
          previousSchool: row.previousSchool,
        });

        imported.push(student);
      } catch (err: any) {
        errors.push({
          row: index + 1,
          error: err.message ?? 'Unknown validation error',
        });
      }
    }

    return {
      total: dto.students.length,
      importedCount: imported.length,
      errorCount: errors.length,
      errors,
    };
  }

  // ---------------------------------------------------------------------------
  // Guardian Relationships
  // ---------------------------------------------------------------------------

  async linkGuardian(principal: AuthPrincipal, studentId: string, dto: LinkGuardianDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, studentId);

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, ...this.tenantScope(organizationId) },
      select: { id: true, schoolId: true },
    });
    if (!student) throw new NotFoundException('Student', studentId);

    const guardian = await this.prisma.guardian.findFirst({
      where: { id: dto.guardianId, schoolId: student.schoolId },
      select: { id: true },
    });
    if (!guardian) throw new NotFoundException('Guardian', dto.guardianId);

    return this.prisma.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId, guardianId: dto.guardianId } },
      create: {
        studentId,
        guardianId: dto.guardianId,
        relation: dto.relation,
        isPrimary: dto.isPrimary ?? false,
        isLegalGuardian: dto.isLegalGuardian ?? false,
        canPickup: dto.canPickup ?? true,
        hasPortalAccess: dto.hasPortalAccess ?? false,
      },
      update: {
        relation: dto.relation,
        isPrimary: dto.isPrimary,
        isLegalGuardian: dto.isLegalGuardian,
        canPickup: dto.canPickup,
        hasPortalAccess: dto.hasPortalAccess,
      },
    });
  }

  async unlinkGuardian(principal: AuthPrincipal, studentId: string, guardianId: string) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertCanAccessStudent(principal, studentId);

    await this.prisma.studentGuardian.deleteMany({
      where: {
        studentId,
        guardianId,
        student: { school: { organizationId } },
      },
    });

    return { studentId, guardianId };
  }

  private buildOrderBy(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc',
  ): Prisma.StudentOrderByWithRelationInput {
    const allowed = new Set(['createdAt', 'updatedAt', 'lastName', 'firstName', 'studentNumber']);
    const field = sortBy && allowed.has(sortBy) ? sortBy : 'createdAt';
    return { [field]: sortOrder };
  }
}
