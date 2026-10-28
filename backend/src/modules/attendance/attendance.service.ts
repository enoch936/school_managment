import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import { AttendanceQueryDto, BulkAttendanceDto } from './dto/attendance.dto';
import { ResourceAuthorizationService } from '../authorization/resource-authorization.service';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resourceAuth: ResourceAuthorizationService,
  ) {}

  async recordBulk(principal: AuthPrincipal, dto: BulkAttendanceDto) {
    const organizationId = principal.activeOrganizationId ?? '';
    const recordedById = principal.userId;

    // Multi-tenant, campus, teacher assignment, and academic-year boundary validation
    await this.resourceAuth.assertSchoolScope(principal, dto.schoolId);
    await this.resourceAuth.assertTeacherAssignment(principal, dto.classId);
    await this.resourceAuth.assertAcademicYearMutable(principal, dto.date, dto.schoolId);

    const school = await this.prisma.school.findFirst({
      where: { id: dto.schoolId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!school) throw new DomainException('INVALID_SCHOOL', 'School not found in your organization');

    const studentIds = dto.entries.map((e) => e.studentId);
    const validStudents = await this.prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId: dto.schoolId, deletedAt: null },
      select: { id: true },
    });
    const validIds = new Set(validStudents.map((s) => s.id));
    const invalid = studentIds.filter((id) => !validIds.has(id));
    if (invalid.length) {
      throw new DomainException(
        'INVALID_STUDENTS',
        'Some students are not part of this school',
        undefined,
        { invalid },
      );
    }

    const date = new Date(dto.date);
    const period = dto.period ?? 0;
    const mode = dto.mode ?? 'DAILY';

    await this.prisma.$transaction(
      dto.entries.map((entry) =>
        this.prisma.attendanceRecord.upsert({
          where: {
            studentId_date_period: { studentId: entry.studentId, date, period },
          },
          create: {
            schoolId: dto.schoolId,
            studentId: entry.studentId,
            classId: dto.classId,
            date,
            period,
            mode,
            status: entry.status,
            minutesLate: entry.minutesLate,
            note: entry.note,
            recordedById,
          },
          update: {
            status: entry.status,
            minutesLate: entry.minutesLate,
            note: entry.note,
            recordedById,
          },
        }),
      ),
    );

    return { recorded: dto.entries.length, date: dto.date, period };
  }

  async list(principal: AuthPrincipal, query: AttendanceQueryDto) {
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
      roles.has('vice_principal');

    const effectiveSchoolId = principal.activeSchoolId;
    const schools = await this.prisma.school.findMany({
      where: {
        organizationId,
        ...(effectiveSchoolId ? { id: effectiveSchoolId } : {}),
        deletedAt: null,
      },
      select: { id: true },
    });
    const schoolIds = schools.map((s) => s.id);

    const where: Prisma.AttendanceRecordWhereInput = {
      schoolId: { in: schoolIds },
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    if (isParent && !isAdmin) {
      const guardian = await this.prisma.guardian.findUnique({
        where: { userId: principal.userId },
        select: { id: true },
      });
      if (guardian) {
        const studentGuardians = await this.prisma.studentGuardian.findMany({
          where: { guardianId: guardian.id },
          select: { studentId: true },
        });
        const allowedStudentIds = studentGuardians.map((sg) => sg.studentId);
        where.studentId = { in: allowedStudentIds };
      } else {
        return paginate([], 0, query.page, query.pageSize);
      }
    } else if (isStudent && !isAdmin) {
      const student = await this.prisma.student.findFirst({
        where: { userId: principal.userId },
        select: { id: true },
      });
      if (student) {
        where.studentId = student.id;
      } else {
        return paginate([], 0, query.page, query.pageSize);
      }
    } else if (isTeacher && !isAdmin) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: principal.userId },
        include: { assignments: true },
      });
      if (teacher && teacher.assignments.length > 0) {
        const assignedClassIds = teacher.assignments.map((a) => a.classId);
        where.classId = { in: assignedClassIds };
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceRecord.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return paginate(data, total, query.page, query.pageSize);
  }

  async summary(principal: AuthPrincipal, schoolId: string, dateFrom?: string, dateTo?: string) {
    const organizationId = principal.activeOrganizationId ?? '';
    await this.resourceAuth.assertSchoolScope(principal, schoolId);

    const school = await this.prisma.school.findFirst({
      where: { id: schoolId, organizationId },
      select: { id: true },
    });
    if (!school) throw new DomainException('INVALID_SCHOOL', 'School not found in your organization');

    const grouped = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: {
        schoolId,
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      },
      _count: { _all: true },
    });

    const totals: Record<string, number> = {};
    let total = 0;
    grouped.forEach((g) => {
      totals[g.status] = g._count._all;
      total += g._count._all;
    });

    const present = (totals.PRESENT ?? 0) + (totals.LATE ?? 0);
    return {
      total,
      byStatus: totals,
      attendanceRate: total ? Math.round((present / total) * 1000) / 10 : 0,
    };
  }
}
