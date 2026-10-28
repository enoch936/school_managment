'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, FileText, Calendar, Loader2, Award } from 'lucide-react';
import { api } from '@/lib/api/client';
import { assignmentsApi } from '@/features/assignments/api';
import type { School, ClassEntity, Subject, Assignment, Submission } from '@/lib/api/domain';
import { useAuthStore } from '@/lib/auth/store';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
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
import { formatDate } from '@/lib/utils';

export default function AssignmentsPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('assignment:manage');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  const query = useQuery({
    queryKey: ['assignments', { page, search: debouncedSearch }],
    queryFn: () =>
      assignmentsApi.list({
        page,
        pageSize: 20,
        search: debouncedSearch || undefined,
      }),
  });

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get<ClassEntity[]>('/classes', { query: { pageSize: 50 } }),
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get<Subject[]>('/subjects', { query: { pageSize: 50 } }),
  });

  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.get<School[]>('/schools', { query: { pageSize: 50 } }),
  });

  const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);
  const subjects = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data]);
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assignments & LMS</h1>
          <p className="text-sm text-muted-foreground">
            Create course assignments, collect student submissions, and record marks with feedback.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" /> Create Assignment
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meta?.total ?? '—'}</div>
            <p className="text-xs text-muted-foreground">Across all subjects and terms</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            {meta ? `${meta.total} assignment${meta.total === 1 ? '' : 's'}` : 'Assignments'}
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              className="pl-8 sm:w-64"
              placeholder="Search title, description"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Max Marks</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8">
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No assignments found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.title}
                    {a.allowLate && (
                      <span className="block text-xs text-amber-600">Late submissions allowed</span>
                    )}
                  </TableCell>
                  <TableCell>{a.class?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.subject?.name ?? 'Subject'}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{a.maxScore} pts</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(a.dueAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {a._count?.submissions ?? 0} submitted
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAssignment(a)}
                      className="text-xs"
                    >
                      View & Grade
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAssignmentModal
          classes={classes}
          subjects={subjects}
          schools={schools}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            void queryClient.invalidateQueries({ queryKey: ['assignments'] });
          }}
        />
      )}

      {/* Submissions & Grading Drawer/Modal */}
      {selectedAssignment && (
        <SubmissionsModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </div>
  );
}

function CreateAssignmentModal({
  classes,
  subjects,
  schools,
  onClose,
  onSuccess,
}: {
  classes: ClassEntity[];
  subjects: Subject[];
  schools: School[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [dueAt, setDueAt] = useState('');
  const [allowLate, setAllowLate] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      assignmentsApi.create({
        schoolId,
        classId,
        subjectId,
        title,
        description: description || undefined,
        maxScore,
        dueAt: new Date(dueAt).toISOString(),
        allowLate,
      }),
    onSuccess: () => {
      toast.success('Assignment created successfully');
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create assignment');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>Create Course Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>School</Label>
            <select
              aria-label="Select school"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Chapter 4 Calculus Problem Set"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label>Description / Instructions</Label>
            <textarea
              rows={3}
              placeholder="Complete odd questions 1 to 25 and show full derivation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Class *</Label>
              <select
                aria-label="Select class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Subject *</Label>
              <select
                aria-label="Select subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Max Marks</Label>
              <Input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="allowLate"
              checked={allowLate}
              onChange={(e) => setAllowLate(e.target.checked)}
              className="rounded border-input text-primary"
            />
            <Label htmlFor="allowLate" className="text-xs cursor-pointer">
              Allow late submissions with penalty flag
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !title || !classId || !subjectId || !dueAt}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish Assignment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SubmissionsModal({
  assignment,
  onClose,
}: {
  assignment: Assignment;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');

  const submissionsQuery = useQuery({
    queryKey: ['submissions', assignment.id],
    queryFn: () => assignmentsApi.listSubmissions(assignment.id),
  });

  const gradeMutation = useMutation({
    mutationFn: () =>
      assignmentsApi.gradeSubmission(assignment.id, gradingSubmission!.id, {
        score,
        feedback: feedback || undefined,
      }),
    onSuccess: () => {
      toast.success('Grade recorded successfully');
      setGradingSubmission(null);
      void queryClient.invalidateQueries({ queryKey: ['submissions', assignment.id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to record grade');
    },
  });

  const submissions = submissionsQuery.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-3xl shadow-xl max-h-[85vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{assignment.title} — Submissions</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Max Marks: {assignment.maxScore} pts | Class: {assignment.class?.name}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissionsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8">
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!submissionsQuery.isLoading && submissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No submissions received yet.
                  </TableCell>
                </TableRow>
              )}
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    {sub.student?.firstName} {sub.student?.lastName}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {sub.student?.studentNumber}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {sub.submittedAt ? formatDate(sub.submittedAt) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sub.status === 'GRADED' ? 'success' : sub.status === 'LATE' ? 'warning' : 'secondary'}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {sub.score !== null && sub.score !== undefined ? `${sub.score} / ${assignment.maxScore}` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setGradingSubmission(sub);
                        setScore(sub.score ?? 0);
                        setFeedback(sub.feedback ?? '');
                      }}
                    >
                      <Award className="mr-1 h-3.5 w-3.5" /> Grade
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>

        {gradingSubmission && (
          <div className="border-t bg-muted/30 p-4 space-y-3">
            <h4 className="font-semibold text-sm">
              Grading {gradingSubmission.student?.firstName} {gradingSubmission.student?.lastName}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Score (Max: {assignment.maxScore})</Label>
                <Input
                  type="number"
                  max={assignment.maxScore}
                  min={0}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Feedback</Label>
                <Input
                  placeholder="Well organized, clear reasoning"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setGradingSubmission(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => gradeMutation.mutate()}
                disabled={gradeMutation.isPending || score > assignment.maxScore || score < 0}
              >
                {gradeMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Save Grade
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
