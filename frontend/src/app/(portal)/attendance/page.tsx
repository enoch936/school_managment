'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequestWithMeta } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: string;
  note: string | null;
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PRESENT: 'success',
  LATE: 'warning',
  ABSENT: 'destructive',
  EXCUSED: 'secondary',
  HALF_DAY: 'warning',
};

export default function AttendancePage() {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');

  const query = useQuery({
    queryKey: ['attendance', { page, dateFrom }],
    queryFn: () =>
      apiRequestWithMeta<AttendanceRecord>('/attendance', {
        query: { page, pageSize: 20, dateFrom: dateFrom || undefined },
      }),
    placeholderData: (prev) => prev,
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">Attendance records across your school.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{meta ? `${meta.total} records` : 'Records'}</CardTitle>
          <div className="flex items-center gap-2">
            <label htmlFor="dateFrom" className="text-sm text-muted-foreground">
              From
            </label>
            <Input
              id="dateFrom"
              type="date"
              className="w-40"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No attendance records found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-xs">{record.studentId.slice(0, 8)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[record.status] ?? 'secondary'}>{record.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{record.note ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {meta && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={!meta.hasPrevious} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {meta.page}</span>
          <Button variant="outline" size="sm" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
