'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, GraduationCap, School, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/dashboards/kpi-card';
import { EnrollmentTrendChart } from '@/components/charts/enrollment-trend-chart';
import { dashboardApi } from '@/features/dashboard/api';
import { useAuth } from '@/components/providers/auth-provider';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const overview = useQuery({ queryKey: ['dashboard', 'overview'], queryFn: dashboardApi.overview });
  const trend = useQuery({
    queryKey: ['dashboard', 'enrollment-trend'],
    queryFn: () => dashboardApi.enrollmentTrend(6),
  });

  const data = overview.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here is an overview of your institution across current academic records.
        </p>
      </div>

      {overview.isError && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 pt-6 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Unable to load dashboard data. Check that the API and database are running.</span>
            <Button variant="outline" size="sm" onClick={() => overview.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total students"
          value={data?.students.total ?? '-'}
          hint={`${data?.students.active ?? 0} active`}
          icon={Users}
          loading={overview.isLoading}
        />
        <KpiCard
          title="Teachers"
          value={data?.teachers ?? '-'}
          icon={GraduationCap}
          loading={overview.isLoading}
        />
        <KpiCard
          title="Classes"
          value={data?.classes ?? '-'}
          hint={`${data?.schools ?? 0} schools`}
          icon={School}
          loading={overview.isLoading}
        />
        <KpiCard
          title="Outstanding fees"
          value={data ? formatCurrency(data.finance.outstandingMinor, data.finance.currency) : '-'}
          hint={data ? `${formatCurrency(data.finance.collectedMinor, data.finance.currency)} collected` : undefined}
          icon={Wallet}
          tone="warning"
          loading={overview.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <EnrollmentTrendChart data={trend.data} loading={trend.isLoading} />

        <Card>
          <CardHeader>
            <CardTitle>Attendance today</CardTitle>
            <CardDescription>Present and late vs. recorded records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-semibold">
              {overview.isLoading ? '-' : `${data?.attendanceToday.rate ?? 0}%`}
            </div>
            <div className="space-y-2 text-sm">
              {Object.entries(data?.attendanceToday.byStatus ?? {}).length === 0 && !overview.isLoading && (
                <p className="text-muted-foreground">No attendance recorded today.</p>
              )}
              {Object.entries(data?.attendanceToday.byStatus ?? {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{status.toLowerCase()}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
