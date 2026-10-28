'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Download,
  Users,
  CalendarCheck,
  CreditCard,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { AttendanceReport, EnrollmentReport, FinanceReport } from '@/lib/api/domain';
import { useAuthStore } from '@/lib/auth/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ReportsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canExport = hasPermission('report:export');

  const [activeTab, setActiveTab] = useState<'enrollment' | 'attendance' | 'finance'>('enrollment');

  // Enrollment Query
  const enrollmentQuery = useQuery({
    queryKey: ['reports-enrollment'],
    queryFn: () => api.get<EnrollmentReport>('/reports/enrollment'),
    enabled: activeTab === 'enrollment',
  });

  // Attendance Query
  const attendanceQuery = useQuery({
    queryKey: ['reports-attendance'],
    queryFn: () => api.get<AttendanceReport>('/reports/attendance'),
    enabled: activeTab === 'attendance',
  });

  // Finance Query
  const financeQuery = useQuery({
    queryKey: ['reports-finance'],
    queryFn: () => api.get<FinanceReport>('/reports/finance'),
    enabled: activeTab === 'finance',
  });

  const handleExport = (type: 'students' | 'invoices' | 'attendance') => {
    toast.info(`Preparing ${type} CSV export...`);
    window.open(`/api/v1/reports/export/${type}`, '_blank');
  };

  const enrollment = enrollmentQuery.data;
  const attendance = attendanceQuery.data;
  const finance = financeQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Aggregate institutional statistics, attendance trends, and financial performance.
          </p>
        </div>
        {canExport && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  activeTab === 'enrollment' ? 'students' : activeTab === 'finance' ? 'invoices' : 'attendance',
                )
              }
            >
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'enrollment' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('enrollment')}
        >
          <Users className="mr-1.5 h-4 w-4" /> Enrollment & Demographics
        </Button>
        <Button
          variant={activeTab === 'attendance' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('attendance')}
        >
          <CalendarCheck className="mr-1.5 h-4 w-4" /> Attendance Analytics
        </Button>
        <Button
          variant={activeTab === 'finance' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('finance')}
        >
          <CreditCard className="mr-1.5 h-4 w-4" /> Finance & Revenue
        </Button>
      </div>

      {/* Content based on tab */}
      {activeTab === 'enrollment' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Registered Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {enrollment ? enrollment.totalStudents : <Skeleton className="h-8 w-24" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Active institutional roster</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {enrollment ? (
                  <div className="space-y-1 text-sm">
                    {Object.entries(enrollment.byGender).map(([gender, count]) => (
                      <div key={gender} className="flex justify-between">
                        <span className="capitalize text-muted-foreground">{gender.toLowerCase()}:</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Skeleton className="h-16 w-full" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {enrollment ? (
                  <div className="space-y-1 text-sm">
                    {Object.entries(enrollment.byStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span className="capitalize text-muted-foreground">{status.toLowerCase()}:</span>
                        <Badge variant={status === 'ACTIVE' ? 'success' : 'secondary'}>{count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Skeleton className="h-16 w-full" />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enrollment by Class / Grade Level</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Enrolled Students</TableHead>
                    <TableHead>Proportion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollmentQuery.isLoading && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  )}
                  {enrollment &&
                    Object.entries(enrollment.byClass).map(([cls, count]) => {
                      const pct = Math.round((count / (enrollment.totalStudents || 1)) * 100);
                      return (
                        <TableRow key={cls}>
                          <TableCell className="font-medium">{cls}</TableCell>
                          <TableCell>{count} students</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-32 rounded-full bg-secondary overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Attendance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-extrabold text-primary">
                  {attendance ? `${attendance.attendanceRate}%` : <Skeleton className="h-10 w-24" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {attendance ? attendance.totalRecords : 0} attendance marks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded border p-2">
                      <div className="text-xs text-muted-foreground">Present</div>
                      <div className="text-lg font-bold text-emerald-600">
                        {attendance.breakdown.PRESENT ?? 0}
                      </div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-xs text-muted-foreground">Late</div>
                      <div className="text-lg font-bold text-amber-600">
                        {attendance.breakdown.LATE ?? 0}
                      </div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-xs text-muted-foreground">Absent</div>
                      <div className="text-lg font-bold text-destructive">
                        {attendance.breakdown.ABSENT ?? 0}
                      </div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-xs text-muted-foreground">Excused</div>
                      <div className="text-lg font-bold text-secondary-foreground">
                        {attendance.breakdown.EXCUSED ?? 0}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-20 w-full" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gross Invoiced</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {finance ? `${(finance.totalInvoicedMinor / 100).toLocaleString()} ${finance.currency}` : <Skeleton className="h-8 w-28" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total revenue generated</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Net Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {finance ? `${(finance.totalCollectedMinor / 100).toLocaleString()} ${finance.currency}` : <Skeleton className="h-8 w-28" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {finance ? `${finance.collectionEfficiency}% realized efficiency` : 'Calculating...'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {finance ? `${(finance.totalOutstandingMinor / 100).toLocaleString()} ${finance.currency}` : <Skeleton className="h-8 w-28" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pending payments</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
