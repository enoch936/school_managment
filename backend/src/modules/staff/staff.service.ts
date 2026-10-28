import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import {
  CreateStaffDto,
  CreateTeacherAssignmentDto,
  CreateTeacherDto,
  StaffQueryDto,
} from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

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

  private async getOrganizationSchoolIds(organizationId: string): Promise<string[]> {
    const schools = await this.prisma.school.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true },
    });
    return schools.map((s) => s.id);
  }

  async createStaff(organizationId: string, dto: CreateStaffDto) {
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    const existing = await this.prisma.staff.findUnique({
      where: {
        schoolId_employeeCode: {
          schoolId: dto.schoolId,
          employeeCode: dto.employeeCode,
        },
      },
    });
    if (existing) {
      throw new DomainException(
        'EMPLOYEE_CODE_EXISTS',
        `Employee code ${dto.employeeCode} is already registered in this school`,
        HttpStatus.CONFLICT,
      );
    }

    return this.prisma.staff.create({
      data: {
        schoolId: dto.schoolId,
        campusId: dto.campusId,
        employeeCode: dto.employeeCode,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        jobTitle: dto.jobTitle,
        email: dto.email,
        phone: dto.phone,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      },
      include: {
        school: { select: { id: true, name: true } },
      },
    });
  }

  async findAllStaff(organizationId: string, query: StaffQueryDto) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const where: Prisma.StaffWhereInput = {
      deletedAt: null,
      schoolId: query.schoolId ? query.schoolId : { in: schoolIds },
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { employeeCode: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { jobTitle: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          school: { select: { id: true, name: true } },
        },
      }),
      this.prisma.staff.count({ where }),
    ]);

    return paginate(items, total, query.page, query.pageSize);
  }

  async createTeacher(organizationId: string, dto: CreateTeacherDto) {
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    const existing = await this.prisma.teacher.findUnique({
      where: {
        schoolId_employeeCode: {
          schoolId: dto.schoolId,
          employeeCode: dto.employeeCode,
        },
      },
    });
    if (existing) {
      throw new DomainException(
        'TEACHER_CODE_EXISTS',
        `Teacher employee code ${dto.employeeCode} already exists in this school`,
        HttpStatus.CONFLICT,
      );
    }

    return this.prisma.teacher.create({
      data: {
        schoolId: dto.schoolId,
        employeeCode: dto.employeeCode,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        departmentId: dto.departmentId,
        qualification: dto.qualification,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      },
      include: {
        school: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });
  }

  async findAllTeachers(organizationId: string, query: StaffQueryDto) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const where: Prisma.TeacherWhereInput = {
      deletedAt: null,
      schoolId: query.schoolId ? query.schoolId : { in: schoolIds },
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { employeeCode: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { qualification: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          school: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          assignments: {
            include: {
              subject: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return paginate(items, total, query.page, query.pageSize);
  }

  async assignTeacher(organizationId: string, dto: CreateTeacherAssignmentDto) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: dto.teacherId, schoolId: { in: schoolIds }, deletedAt: null },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found in your organization');
    }

    return this.prisma.teacherAssignment.upsert({
      where: {
        teacherId_subjectId_classId_sectionId_academicYearId: {
          teacherId: dto.teacherId,
          subjectId: dto.subjectId,
          classId: dto.classId,
          sectionId: dto.sectionId ?? '',
          academicYearId: dto.academicYearId,
        },
      },
      update: {},
      create: {
        teacherId: dto.teacherId,
        subjectId: dto.subjectId,
        classId: dto.classId,
        sectionId: dto.sectionId,
        academicYearId: dto.academicYearId,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findTeacherAssignments(organizationId: string, teacherId: string) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId: { in: schoolIds }, deletedAt: null },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found in your organization');
    }

    return this.prisma.teacherAssignment.findMany({
      where: { teacherId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
      },
    });
  }
}
