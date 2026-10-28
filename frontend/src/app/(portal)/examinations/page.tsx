'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, GraduationCap, CheckCircle2, Loader2 } from 'lucide-react';
import { api, apiRequestWithMeta } from '@/lib/api/client';
import type { AcademicYear, ClassEntity, Exam, School, Subject } from '@/lib/api/domain';
import { useAuthStore } from '@/lib/auth/store';
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

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'secondary' | 'destructive'> = {
  DRAFT: 'secondary',
  SCHEDULED: 'warning',
  PUBLISHED: 'default',
  ONGOING: 'warning',
  CLOSED: 'secondary',
  GRADED: 'success',
  ARCHIVED: 'secondary',
};

export default function ExaminationsPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('exam:manage');
  const canPublish = hasPermission('grade:publish');

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [showForm, setShowForm] = useState(false);

  const query = useQuery({
    queryKey: ['examinations', { page, status }],
    queryFn: () =>
      apiRequestWithMeta<Exam>('/examinations', {
        query: { page, pageSize: 20, status: status || undefined },
      }),
    placeholderData: (prev) => prev,
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/examinations/${id}/publish`, {}),
    onSuccess: () => {
      toast.success('Exam published successfully');
      void queryClient.invalidateQueries({ queryKey: ['examinations'] });
    },
    onError: () => toast.error('Unable to publish exam'),
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Examinations & Grading</h1>
          <p className="text-sm text-muted-foreground">
            Schedule exams, record marks, and publish term results.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> Schedule exam
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <CreateExamForm
          onCreated={() => {
            setShowForm(false);
            void queryClient.invalidateQueries({ queryKey: ['examinations'] });
          }}
        />
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            {meta ? `${meta.total} examination${meta.total === 1 ? '' : 's'}` : 'Examinations'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-status" className="text-sm text-muted-foreground">
              Status:
            </label>
            <select
              id="filter-status"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ONGOING', 'CLOSED', 'GRADED'].map((s) => (
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
                <TableHead>Title</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Pass / Max</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submissions</TableHead>
                {canPublish && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={canPublish ? 7 : 6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canPublish ? 7 : 6} className="py-10 text-center text-muted-foreground">
                    No examinations scheduled.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" aria-hidden />
                      {exam.title}
                    </div>
                  </TableCell>
                  <TableCell>{exam.class?.name ?? '-'}</TableCell>
                  <TableCell>
                    {exam.subject ? `${exam.subject.name} (${exam.subject.code})` : '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {exam.passMark} / {exam.totalMarks}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[exam.status] ?? 'secondary'}>
                      {exam.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{exam._count?.attempts ?? 0} graded</TableCell>
                  {canPublish && (
                    <TableCell className="text-right">
                      {exam.status === 'DRAFT' || exam.status === 'SCHEDULED' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={publishMutation.isPending}
                          onClick={() => publishMutation.mutate(exam.id)}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-primary" />
                          Publish
                        </Button>
                      ) : null}
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

function CreateExamForm({ onCreated }: { onCreated: () => void }) {
  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.get<School[]>('/schools', { query: { pageSize: 50 } }),
  });
  const yearsQuery = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get<AcademicYear[]>('/academic-years', { query: { pageSize: 50 } }),
  });
  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get<ClassEntity[]>('/classes', { query: { pageSize: 50 } }),
  });
  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get<Subject[]>('/subjects', { query: { pageSize: 50 } }),
  });

  const schools = schoolsQuery.data ?? [];
  const years = yearsQuery.data ?? [];
  const classes = classesQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];

  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [academicYearId, setAcademicYearId] = useState(years[0]?.id ?? '');
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('FINAL');
  const [totalMarks, setTotalMarks] = useState(100);
  const [passMark, setPassMark] = useState(50);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/examinations', {
        schoolId: schoolId || schools[0]?.id,
        academicYearId: academicYearId || years[0]?.id,
        classId: classId || classes[0]?.id,
        subjectId: subjectId || subjects[0]?.id,
        title,
        type,
        totalMarks: Number(totalMarks),
        passMark: Number(passMark),
      }),
    onSuccess: () => {
      toast.success('Exam scheduled successfully');
      onCreated();
    },
    onError: () => toast.error('Unable to schedule exam'),
  });

  const disabled = !title || mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Schedule New Examination</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="exam-school">School</Label>
            <select
              id="exam-school"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-year">Academic Year</Label>
            <select
              id="exam-year"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-title">Exam title</Label>
            <Input
              id="exam-title"
              placeholder="e.g. Midterm Physics Examination"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-class">Class</Label>
            <select
              id="exam-class"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-subject">Subject</Label>
            <select
              id="exam-subject"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-type">Type</Label>
            <select
              id="exam-type"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {['MIDTERM', 'FINAL', 'QUIZ', 'PRACTICAL'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-total">Total Marks</Label>
            <Input
              id="exam-total"
              type="number"
              value={totalMarks}
              onChange={(e) => setTotalMarks(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-pass">Passing Mark</Label>
            <Input
              id="exam-pass"
              type="number"
              value={passMark}
              onChange={(e) => setPassMark(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button disabled={disabled} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Schedule Exam
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
