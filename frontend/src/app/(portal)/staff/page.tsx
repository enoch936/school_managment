'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, Briefcase, GraduationCap, Phone, Mail, Loader2, BookOpen } from 'lucide-react';
import { api } from '@/lib/api/client';
import { staffApi } from '@/features/staff/api';
import type { School, ClassEntity, Subject, StaffMember, Teacher } from '@/lib/api/domain';
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

export default function StaffPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('staff:manage') || hasPermission('teacher:manage');

  const [activeTab, setActiveTab] = useState<'teachers' | 'staff'>('teachers');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState<Teacher | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  const teachersQuery = useQuery({
    queryKey: ['teachers', { page, search: debouncedSearch }],
    queryFn: () => staffApi.listTeachers({ page, pageSize: 20, search: debouncedSearch || undefined }),
    enabled: activeTab === 'teachers',
  });

  const staffQuery = useQuery({
    queryKey: ['staff', { page, search: debouncedSearch }],
    queryFn: () => staffApi.listStaff({ page, pageSize: 20, search: debouncedSearch || undefined }),
    enabled: activeTab === 'staff',
  });

  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.get<School[]>('/schools', { query: { pageSize: 50 } }),
  });

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get<ClassEntity[]>('/classes', { query: { pageSize: 50 } }),
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get<Subject[]>('/subjects', { query: { pageSize: 50 } }),
  });

  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
  const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);
  const subjects = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data]);

  const teacherRows = teachersQuery.data?.data ?? [];
  const staffRows: StaffMember[] = staffQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff & Faculty</h1>
          <p className="text-sm text-muted-foreground">
            Manage teaching faculty, administrative personnel, and course assignments.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowStaffModal(true)}>
              <Plus className="h-4 w-4" /> Add staff
            </Button>
            <Button onClick={() => setShowTeacherModal(true)}>
              <Plus className="h-4 w-4" /> Add teacher
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teaching Faculty</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachersQuery.data?.meta?.total ?? '—'}</div>
            <p className="text-xs text-muted-foreground">Registered teaching professionals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support Staff</CardTitle>
            <Briefcase className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffQuery.data?.meta?.total ?? '—'}</div>
            <p className="text-xs text-muted-foreground">Administrative and operations team</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => {
            setActiveTab('teachers');
            setPage(1);
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'teachers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <GraduationCap className="h-4 w-4" /> Teachers
        </button>
        <button
          onClick={() => {
            setActiveTab('staff');
            setPage(1);
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'staff'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Briefcase className="h-4 w-4" /> Non-Teaching Staff
        </button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            {activeTab === 'teachers' ? 'Faculty Directory' : 'Staff Directory'}
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              className="pl-8 sm:w-64"
              placeholder="Search code, name, email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeTab === 'teachers' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Assigned Subjects</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachersQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                )}
                {!teachersQuery.isLoading && teacherRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No teachers found.
                    </TableCell>
                  </TableRow>
                )}
                {teacherRows.map((tch) => (
                  <TableRow key={tch.id}>
                    <TableCell className="font-mono text-xs">{tch.employeeCode}</TableCell>
                    <TableCell className="font-medium">
                      {tch.firstName} {tch.middleName ? `${tch.middleName} ` : ''}{tch.lastName}
                      {tch.qualification && (
                        <span className="block text-xs text-muted-foreground">{tch.qualification}</span>
                      )}
                    </TableCell>
                    <TableCell>{tch.department?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">
                      {tch.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {tch.email}</div>}
                      {tch.phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /> {tch.phone}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {tch.assignments?.length ? (
                          tch.assignments.map((a) => (
                            <Badge key={a.id} variant="secondary" className="text-[10px]">
                              {a.subject?.name ?? 'Subject'}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tch.status === 'ACTIVE' ? 'success' : 'secondary'}>
                        {tch.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssigningTeacher(tch)}
                          className="text-xs"
                        >
                          <BookOpen className="mr-1 h-3.5 w-3.5" /> Assign
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                )}
                {!staffQuery.isLoading && staffRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No staff members found.
                    </TableCell>
                  </TableRow>
                )}
                {staffRows.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell className="font-mono text-xs">{st.employeeCode}</TableCell>
                    <TableCell className="font-medium">
                      {st.firstName} {st.middleName ? `${st.middleName} ` : ''}{st.lastName}
                    </TableCell>
                    <TableCell>{st.jobTitle ?? '—'}</TableCell>
                    <TableCell className="text-xs">
                      {st.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {st.email}</div>}
                      {st.phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /> {st.phone}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.status === 'ACTIVE' ? 'success' : 'secondary'}>
                        {st.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Teacher Modal */}
      {showTeacherModal && (
        <CreateTeacherModal
          schools={schools}
          onClose={() => setShowTeacherModal(false)}
          onSuccess={() => {
            setShowTeacherModal(false);
            void queryClient.invalidateQueries({ queryKey: ['teachers'] });
          }}
        />
      )}

      {/* Staff Modal */}
      {showStaffModal && (
        <CreateStaffModal
          schools={schools}
          onClose={() => setShowStaffModal(false)}
          onSuccess={() => {
            setShowStaffModal(false);
            void queryClient.invalidateQueries({ queryKey: ['staff'] });
          }}
        />
      )}

      {/* Assign Teacher Modal */}
      {assigningTeacher && (
        <AssignTeacherModal
          teacher={assigningTeacher}
          classes={classes}
          subjects={subjects}
          onClose={() => setAssigningTeacher(null)}
          onSuccess={() => {
            setAssigningTeacher(null);
            void queryClient.invalidateQueries({ queryKey: ['teachers'] });
          }}
        />
      )}
    </div>
  );
}

function CreateTeacherModal({
  schools,
  onClose,
  onSuccess,
}: {
  schools: School[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      staffApi.createTeacher({
        schoolId,
        employeeCode,
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        qualification: qualification || undefined,
      }),
    onSuccess: () => {
      toast.success('Teacher added successfully');
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add teacher');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>Add New Teacher</CardTitle>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Employee Code *</Label>
              <Input
                placeholder="TCH-001"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
              />
            </div>
            <div>
              <Label>Qualification</Label>
              <Input
                placeholder="M.Ed / B.Sc"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !employeeCode || !firstName || !lastName || !schoolId}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Teacher
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateStaffModal({
  schools,
  onClose,
  onSuccess,
}: {
  schools: School[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      staffApi.createStaff({
        schoolId,
        employeeCode,
        firstName,
        lastName,
        jobTitle: jobTitle || undefined,
        email: email || undefined,
        phone: phone || undefined,
      }),
    onSuccess: () => {
      toast.success('Staff member registered');
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add staff member');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>Register Staff Member</CardTitle>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Employee Code *</Label>
              <Input
                placeholder="STF-001"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
              />
            </div>
            <div>
              <Label>Job Title</Label>
              <Input
                placeholder="Accountant / Registrar"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !employeeCode || !firstName || !lastName || !schoolId}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Staff
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AssignTeacherModal({
  teacher,
  classes,
  subjects,
  onClose,
  onSuccess,
}: {
  teacher: Teacher;
  classes: ClassEntity[];
  subjects: Subject[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);

  const mutation = useMutation({
    mutationFn: () =>
      staffApi.assignTeacher({
        teacherId: teacher.id,
        classId,
        subjectId,
        academicYearId: selectedClass?.academicYearId ?? '',
      }),
    onSuccess: () => {
      toast.success('Subject assigned to teacher');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to assign subject');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Assign Teacher to Class</CardTitle>
          <p className="text-xs text-muted-foreground">
            Assigning {teacher.firstName} {teacher.lastName} ({teacher.employeeCode})
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Class</Label>
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
            <Label>Subject</Label>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !classId || !subjectId}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Subject
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
