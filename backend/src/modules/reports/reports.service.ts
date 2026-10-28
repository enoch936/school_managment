import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ReportFilterDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrganizationSchoolIds(organizationId: string): Promise<string[]> {
    const schools = await this.prisma.school.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true },
    });
    return schools.map((s) => s.id);
  }

  // --- Enrollment & Demographics ---
  async getEnrollmentReport(organizationId: string, filter: ReportFilterDto) {
    const where: Prisma.StudentWhereInput = {
      deletedAt: null,
      school: {
        organizationId,
        ...(filter.schoolId ? { id: filter.schoolId } : {}),
      },
    };

    const students = await this.prisma.student.findMany({
      where,
      select: {
        gender: true,
        status: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          select: { class: { select: { name: true } } },
        },
      },
    });

    const genderStats: Record<string, number> = {};
    const statusStats: Record<string, number> = {};
    const classStats: Record<string, number> = {};

    for (const s of students) {
      genderStats[s.gender] = (genderStats[s.gender] ?? 0) + 1;
      statusStats[s.status] = (statusStats[s.status] ?? 0) + 1;

      const activeClass = s.enrollments[0]?.class?.name ?? 'Unassigned';
      classStats[activeClass] = (classStats[activeClass] ?? 0) + 1;
    }

    return {
      totalStudents: students.length,
      byGender: genderStats,
      byStatus: statusStats,
      byClass: classStats,
    };
  }

  // --- Attendance Analytics ---
  async getAttendanceReport(organizationId: string, filter: ReportFilterDto) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const where: Prisma.AttendanceRecordWhereInput = {
      schoolId: filter.schoolId ? filter.schoolId : { in: schoolIds },
      ...(filter.dateFrom || filter.dateTo
        ? {
            date: {
              ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
              ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
            },
          }
        : {}),
    };

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      select: { status: true },
    });

    const counts: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
      HALF_DAY: 0,
    };

    for (const r of records) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }

    const total = records.length;
    const attendanceRate =
      total > 0
        ? Math.round(((counts.PRESENT + counts.LATE * 0.5) / total) * 100)
        : 100;

    return {
      totalRecords: total,
      attendanceRate,
      breakdown: counts,
    };
  }

  // --- Financial Collection Summary ---
  async getFinanceReport(organizationId: string, filter: ReportFilterDto) {
    const where: Prisma.InvoiceWhereInput = {
      school: {
        organizationId,
        ...(filter.schoolId ? { id: filter.schoolId } : {}),
      },
    };

    const invoices = await this.prisma.invoice.findMany({
      where,
      select: {
        totalMinor: true,
        balanceMinor: true,
        status: true,
        currency: true,
      },
    });

    let totalInvoicedMinor = 0;
    let totalOutstandingMinor = 0;
    const statusCounts: Record<string, number> = {};

    for (const inv of invoices) {
      totalInvoicedMinor += inv.totalMinor;
      totalOutstandingMinor += inv.balanceMinor;
      statusCounts[inv.status] = (statusCounts[inv.status] ?? 0) + 1;
    }

    const totalCollectedMinor = totalInvoicedMinor - totalOutstandingMinor;
    const currency = invoices[0]?.currency ?? 'ETB';

    return {
      currency,
      totalInvoicedMinor,
      totalCollectedMinor,
      totalOutstandingMinor,
      collectionEfficiency:
        totalInvoicedMinor > 0
          ? Math.round((totalCollectedMinor / totalInvoicedMinor) * 100)
          : 0,
      statusCounts,
    };
  }

  // --- CSV Export Generation ---
  async exportCsv(
    organizationId: string,
    type: 'students' | 'invoices' | 'attendance',
    filter: ReportFilterDto,
  ): Promise<string> {
    if (type === 'students') {
      const students = await this.prisma.student.findMany({
        where: {
          deletedAt: null,
          school: {
            organizationId,
            ...(filter.schoolId ? { id: filter.schoolId } : {}),
          },
        },
        select: {
          studentNumber: true,
          firstName: true,
          lastName: true,
          gender: true,
          status: true,
          createdAt: true,
        },
      });

      const header = 'Student Number,First Name,Last Name,Gender,Status,Enrollment Date\n';
      const rows = students
        .map(
          (s) =>
            `"${s.studentNumber}","${s.firstName}","${s.lastName}","${s.gender}","${s.status}","${s.createdAt.toISOString()}"`,
        )
        .join('\n');
      return header + rows;
    }

    if (type === 'invoices') {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          school: {
            organizationId,
            ...(filter.schoolId ? { id: filter.schoolId } : {}),
          },
        },
        include: {
          student: { select: { studentNumber: true, firstName: true, lastName: true } },
        },
      });

      const header = 'Invoice Number,Student,Total,Balance,Currency,Status,Due Date\n';
      const rows = invoices
        .map(
          (i) =>
            `"${i.invoiceNumber}","${i.student.firstName} ${i.student.lastName} (${i.student.studentNumber})",${(i.totalMinor / 100).toFixed(2)},${(i.balanceMinor / 100).toFixed(2)},"${i.currency}","${i.status}","${i.dueDate ? i.dueDate.toISOString() : ''}"`,
        )
        .join('\n');
      return header + rows;
    }

    // Default attendance export
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const attendance = await this.prisma.attendanceRecord.findMany({
      where: {
        schoolId: filter.schoolId ? filter.schoolId : { in: schoolIds },
      },
      include: {
        student: { select: { studentNumber: true, firstName: true, lastName: true } },
      },
      take: 1000,
    });

    const header = 'Date,Student Number,Student Name,Status,Note\n';
    const rows = attendance
      .map(
        (a) =>
          `"${a.date.toISOString()}","${a.student.studentNumber}","${a.student.firstName} ${a.student.lastName}","${a.status}","${a.note ?? ''}"`,
      )
      .join('\n');
    return header + rows;
  }
}
