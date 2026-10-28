import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import { CreateStudentDto, StudentQueryDto, UpdateStudentDto } from './dto/student.dto';
import { ResourceAuthorizationService } from '../authorization/resource-authorization.service';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';

/**
 * Student persistence and business rules. Every query is scoped by the
 * organization id resolved from the authenticated principal, so a caller can
 * never read or mutate another tenant's students by manipulating ids.
 */
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
      select: { id: true },
    });
    if (!school) {
      throw new DomainException(
        'INVALID_SCHOOL',
        'The selected school does not belong to your organization',
        HttpStatus.BAD_REQUEST,
      );
    }
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

    const duplicate = await this.prisma.student.findFirst({
      where: { schoolId: dto.schoolId, studentNumber: dto.studentNumber },
      select: { id: true },
    });
    if (duplicate) {
      throw new DomainException(
        'DUPLICATE_STUDENT_NUMBER',
        'A student with this number already exists at this school',
        HttpStatus.CONFLICT,
      );
    }

    return this.prisma.student.create({
      data: {
        schoolId: dto.schoolId,
        campusId: dto.campusId,
        studentNumber: dto.studentNumber,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        status: dto.status,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        medicalNotes: dto.medicalNotes,
        previousSchool: dto.previousSchool,
      },
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
      ...(query.classId
        ? { enrollments: { some: { classId: query.classId, status: 'ACTIVE' } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { studentNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Role-specific scoping
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
      this.prisma.student.findMany({ where, orderBy, skip: query.skip, take: query.take }),
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
        guardians: { include: { guardian: true } },
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { class: true, section: true },
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
      select: { id: true, schoolId: true, campusId: true },
    });
    if (!existing) throw new NotFoundException('Student', id);

    if (dto.schoolId) {
      await this.resourceAuth.assertSchoolScope(principal, dto.schoolId);
      await this.assertSchoolInOrganization(dto.schoolId, organizationId);
    }
    if (dto.campusId) {
      this.resourceAuth.assertCampusScope(principal, dto.campusId);
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        campusId: dto.campusId,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        status: dto.status,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        medicalNotes: dto.medicalNotes,
        previousSchool: dto.previousSchool,
      },
    });
  }

  async softDelete(organizationId: string, id: string) {
    const existing = await this.prisma.student.findFirst({
      where: { id, ...this.tenantScope(organizationId) },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Student', id);
    await this.prisma.student.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'WITHDRAWN' },
    });
    return { id };
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
