'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { studentsApi } from '@/features/students/api';
import { schoolsApi } from '@/features/schools/api';
import { useAuthStore } from '@/lib/auth/store';
import { cn, formatDate } from '@/lib/utils';
import type { StudentStatus } from '@/lib/api/domain';

const STATUS_VARIANT: Record<StudentStatus, 'default' | 'success' | 'warning' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  APPLICANT: 'warning',
  TRANSFERRED: 'secondary',
  WITHDRAWN: 'destructive',
  GRADUATED: 'default',
  SUSPENDED: 'destructive',
};

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('student:manage');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StudentStatus | ''>('');
  const [showForm, setShowForm] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 350);

  const studentsQuery = useQuery({
    queryKey: ['students', { page, search: debouncedSearch, status }],
    queryFn: () =>
      studentsApi.list({
        page,
        pageSize: 20,
        search: debouncedSearch || undefined,
        status: status || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: schoolsApi.listWithMeta,
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsApi.remove(id),
    onSuccess: () => {
      toast.success('Student archived');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: () => toast.error('Unable to archive student'),
  });

  const meta = studentsQuery.data?.meta;
  const rows = studentsQuery.data?.data ?? [];
  const schools = useMemo(() => schoolsQuery.data?.data ?? [], [schoolsQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">Manage student records and enrollments.</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> Add student
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <CreateStudentForm
          schools={schools}
          onCreated={() => {
            setShowForm(false);
            void queryClient.invalidateQueries({ queryKey: ['students'] });
          }}
        />
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            {meta ? `${meta.total} student${meta.total === 1 ? '' : 's'}` : 'Students'}
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                className="pl-8 sm:w-64"
                placeholder="Search name or number"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search students"
              />
            </div>
            <select
              aria-label="Filter by status"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StudentStatus | '');
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {['ACTIVE', 'APPLICANT', 'TRANSFERRED', 'WITHDRAWN', 'GRADUATED', 'SUSPENDED'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enrolled</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsQuery.isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={canManage ? 6 : 5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!studentsQuery.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="py-10 text-center text-muted-foreground">
                    No students found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono text-xs">{student.studentNumber}</TableCell>
                  <TableCell className="font-medium">
                    {student.firstName} {student.lastName}
                  </TableCell>
                  <TableCell>{student.gender.toLowerCase()}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[student.status]}>{student.status.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(student.enrollmentDate)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Archive ${student.firstName} ${student.lastName}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(student.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasPrevious}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateStudentForm({
  schools,
  onCreated,
}: {
  schools: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [studentNumber, setStudentNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('UNDISCLOSED');
  const [status, setStatus] = useState<StudentStatus>('APPLICANT');

  const mutation = useMutation({
    mutationFn: () =>
      studentsApi.create({ schoolId, studentNumber, firstName, lastName, gender, status }),
    onSuccess: () => {
      toast.success('Student created');
      setStudentNumber('');
      setFirstName('');
      setLastName('');
      onCreated();
    },
    onError: () => toast.error('Unable to create student'),
  });

  const disabled = !schoolId || !studentNumber || !firstName || !lastName || mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New student</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="new-school">School</Label>
            <select
              id="new-school"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              <option value="">Select school</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-number">Student number</Label>
            <Input id="new-number" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-first">First name</Label>
            <Input id="new-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-last">Last name</Label>
            <Input id="new-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-gender">Gender</Label>
            <select
              id="new-gender"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              {['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED'].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-status">Status</Label>
            <select
              id="new-status"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as StudentStatus)}
            >
              {['APPLICANT', 'ACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'GRADUATED', 'SUSPENDED'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button className={cn('gap-2')} disabled={disabled} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create student
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
