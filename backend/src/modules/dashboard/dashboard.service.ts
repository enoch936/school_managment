import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface TrendPoint {
  label: string;
  value: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(organizationId: string) {
    const [
      students,
      activeStudents,
      teachers,
      classes,
      schools,
      outstanding,
      collected,
    ] = await this.prisma.$transaction([
      this.prisma.student.count({ where: { school: { organizationId }, deletedAt: null } }),
      this.prisma.student.count({
        where: { school: { organizationId }, deletedAt: null, status: 'ACTIVE' },
      }),
      this.prisma.teacher.count({ where: { school: { organizationId }, deletedAt: null } }),
      this.prisma.class.count({ where: { school: { organizationId }, deletedAt: null } }),
      this.prisma.school.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.invoice.aggregate({
        where: { school: { organizationId }, status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } },
        _sum: { balanceMinor: true },
      }),
      this.prisma.payment.aggregate({
        where: { school: { organizationId }, status: 'SUCCEEDED' },
        _sum: { amountMinor: true },
      }),
    ]);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const schoolIds = (
      await this.prisma.school.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true },
      })
    ).map((s) => s.id);

    const attendanceToday = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { schoolId: { in: schoolIds }, date: today },
      _count: { _all: true },
    });

    const byStatus: Record<string, number> = {};
    attendanceToday.forEach((a) => (byStatus[a.status] = a._count._all));
    const attendanceTotal = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const present = (byStatus.PRESENT ?? 0) + (byStatus.LATE ?? 0);

    return {
      students: { total: students, active: activeStudents },
      teachers,
      classes,
      schools,
      finance: {
        currency: 'ETB',
        outstandingMinor: outstanding._sum.balanceMinor ?? 0,
        collectedMinor: collected._sum.amountMinor ?? 0,
      },
      attendanceToday: {
        total: attendanceTotal,
        present,
        rate: attendanceTotal ? Math.round((present / attendanceTotal) * 1000) / 10 : 0,
        byStatus,
      },
    };
  }

  async enrollmentTrend(organizationId: string, months = 6): Promise<TrendPoint[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setUTCHours(0, 0, 0, 0);

    const records = await this.prisma.student.findMany({
      where: { school: { organizationId }, createdAt: { gte: since } },
      select: { createdAt: true },
    });

    const buckets = new Map<string, number>();
    for (let i = 0; i < months; i += 1) {
      const d = new Date(since);
      d.setMonth(since.getMonth() + i);
      buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0);
    }
    records.forEach((r) => {
      const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });

    return [...buckets.entries()].map(([label, value]) => ({ label, value }));
  }
}
