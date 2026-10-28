'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  ShieldAlert,
  HeartPulse,
  Activity,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { studentsApi } from '@/features/students/api';
import { disciplineHealthApi } from '@/features/discipline-health/api';
import type { School, Student } from '@/lib/api/domain';
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

export default function DisciplineHealthPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('discipline:manage') || hasPermission('health:manage');

  const [activeTab, setActiveTab] = useState<'discipline' | 'health'>('discipline');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [selectedStudentForHealth, setSelectedStudentForHealth] = useState<string>('');

  const debouncedSearch = useDebouncedValue(search, 350);

  const casesQuery = useQuery({
    queryKey: ['discipline-cases', { page, search: debouncedSearch }],
    queryFn: () =>
      disciplineHealthApi.listCases({
        page,
        pageSize: 20,
        search: debouncedSearch || undefined,
      }),
    enabled: activeTab === 'discipline',
  });

  const studentsQuery = useQuery({
    queryKey: ['students-brief'],
    queryFn: () => studentsApi.list({ pageSize: 100 }),
  });

  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.get<School[]>('/schools', { query: { pageSize: 50 } }),
  });

  const students: Student[] = useMemo(() => studentsQuery.data?.data ?? [], [studentsQuery.data]);
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);

  const activeStudentHealthQuery = useQuery({
    queryKey: ['health-record', selectedStudentForHealth],
    queryFn: () => disciplineHealthApi.getHealthRecord(selectedStudentForHealth),
    enabled: !!selectedStudentForHealth && activeTab === 'health',
    retry: false,
  });

  const updateCaseMutation = useMutation({
    mutationFn: ({ id, status, actionTaken }: { id: string; status?: string; actionTaken?: string }) =>
      disciplineHealthApi.updateCase(id, { status, actionTaken }),
    onSuccess: () => {
      toast.success('Case updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['discipline-cases'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update case');
    },
  });

  const cases = casesQuery.data?.data ?? [];
  const meta = casesQuery.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Discipline & Student Health</h1>
          <p className="text-sm text-muted-foreground">
            Confidential behavior tracking, incident logs, and student medical/health records.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {activeTab === 'discipline' ? (
              <Button onClick={() => setShowCaseModal(true)}>
                <Plus className="h-4 w-4" /> Log Incident
              </Button>
            ) : (
              <Button onClick={() => setShowHealthModal(true)}>
                <Plus className="h-4 w-4" /> Update Medical Profile
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => {
            setActiveTab('discipline');
            setPage(1);
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'discipline'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldAlert className="h-4 w-4" /> Discipline Cases
        </button>
        <button
          onClick={() => {
            setActiveTab('health');
            setPage(1);
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'health'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <HeartPulse className="h-4 w-4" /> Health & Medical Records
        </button>
      </div>

      {activeTab === 'discipline' ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              {meta ? `${meta.total} case${meta.total === 1 ? '' : 's'}` : 'Discipline Incidents'}
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                className="pl-8 sm:w-64"
                placeholder="Search category, description"
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
                  <TableHead>Incident Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Action Taken</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {casesQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                )}
                {!casesQuery.isLoading && cases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No discipline cases recorded.
                    </TableCell>
                  </TableRow>
                )}
                {cases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(c.incidentDate)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.student?.firstName} {c.student?.lastName}
                      <span className="block font-mono text-xs text-muted-foreground">
                        {c.student?.studentNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.category}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs">{c.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.actionTaken ?? 'None recorded'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.status === 'RESOLVED'
                            ? 'success'
                            : c.status === 'INVESTIGATING'
                            ? 'warning'
                            : 'destructive'
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {c.status !== 'RESOLVED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-emerald-600 hover:text-emerald-700"
                            onClick={() =>
                              updateCaseMutation.mutate({
                                id: c.id,
                                status: 'RESOLVED',
                                actionTaken: c.actionTaken || 'Counseling completed',
                              })
                            }
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Select Student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Student</Label>
                <select
                  aria-label="Select student for medical profile"
                  value={selectedStudentForHealth}
                  onChange={(e) => setSelectedStudentForHealth(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
                >
                  <option value="">Choose student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.studentNumber})
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-rose-500" /> Medical & Health Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedStudentForHealth && (
                <div className="py-12 text-center text-muted-foreground">
                  Select a student from the list to view their confidential health records.
                </div>
              )}

              {selectedStudentForHealth && activeStudentHealthQuery.isLoading && (
                <div className="space-y-3 py-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              )}

              {selectedStudentForHealth &&
                !activeStudentHealthQuery.isLoading &&
                !activeStudentHealthQuery.data && (
                  <div className="py-12 text-center text-muted-foreground">
                    No medical record recorded for this student yet. Click &quot;Update Medical Profile&quot; to create one.
                  </div>
                )}

              {activeStudentHealthQuery.data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-4">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-semibold">
                        Blood Type
                      </span>
                      <p className="font-mono text-base font-bold text-rose-600">
                        {activeStudentHealthQuery.data.bloodType ?? 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-semibold">
                        Known Allergies
                      </span>
                      <p className="text-sm font-medium">
                        {activeStudentHealthQuery.data.allergies ?? 'None reported'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">
                      Medical Conditions
                    </span>
                    <p className="text-sm rounded-md border border-border p-3 bg-card">
                      {activeStudentHealthQuery.data.conditions ?? 'No chronic conditions recorded.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">
                      Prescribed Medications
                    </span>
                    <p className="text-sm rounded-md border border-border p-3 bg-card">
                      {activeStudentHealthQuery.data.medications ?? 'None.'}
                    </p>
                  </div>

                  {activeStudentHealthQuery.data.notes && (
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">
                        Emergency Nurse Notes
                      </span>
                      <p className="text-xs text-muted-foreground rounded-md border border-border p-3 bg-card">
                        {activeStudentHealthQuery.data.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Log Incident Modal */}
      {showCaseModal && (
        <CreateDisciplineModal
          students={students}
          schools={schools}
          onClose={() => setShowCaseModal(false)}
          onSuccess={() => {
            setShowCaseModal(false);
            void queryClient.invalidateQueries({ queryKey: ['discipline-cases'] });
          }}
        />
      )}

      {/* Upsert Health Modal */}
      {showHealthModal && (
        <UpsertHealthModal
          students={students}
          schools={schools}
          selectedStudentId={selectedStudentForHealth}
          onClose={() => setShowHealthModal(false)}
          onSuccess={(stdId) => {
            setShowHealthModal(false);
            setSelectedStudentForHealth(stdId);
            void queryClient.invalidateQueries({ queryKey: ['health-record', stdId] });
          }}
        />
      )}
    </div>
  );
}

function CreateDisciplineModal({
  students,
  schools,
  onClose,
  onSuccess,
}: {
  students: Student[];
  schools: School[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? '');
  const [category, setCategory] = useState('Conduct');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  const selectedStudent = useMemo(() => students.find((s) => s.id === studentId), [students, studentId]);

  const mutation = useMutation({
    mutationFn: () =>
      disciplineHealthApi.createCase({
        schoolId: selectedStudent?.schoolId ?? schools[0]?.id ?? '',
        studentId,
        category,
        incidentDate,
        description,
        actionTaken: actionTaken || undefined,
      }),
    onSuccess: () => {
      toast.success('Discipline incident logged');
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to log incident');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>Log Disciplinary Incident</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Student *</Label>
            <select
              aria-label="Select student for incident log"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.studentNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category *</Label>
              <select
                aria-label="Select category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
              >
                <option value="Conduct">General Conduct</option>
                <option value="Attendance">Attendance / Truancy</option>
                <option value="Academic Integrity">Academic Integrity</option>
                <option value="Bullying">Bullying / Harassment</option>
                <option value="Property Damage">Property Damage</option>
              </select>
            </div>
            <div>
              <Label>Incident Date *</Label>
              <Input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Incident Description *</Label>
            <textarea
              rows={3}
              placeholder="Factual, objective summary of the incident..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
            />
          </div>

          <div>
            <Label>Action Taken / Parent Contact</Label>
            <Input
              placeholder="Parent notified by phone; detention assigned"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !studentId || !description}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Record
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UpsertHealthModal({
  students,
  schools,
  selectedStudentId,
  onClose,
  onSuccess,
}: {
  students: Student[];
  schools: School[];
  selectedStudentId?: string;
  onClose: () => void;
  onSuccess: (studentId: string) => void;
}) {
  const [studentId, setStudentId] = useState(selectedStudentId || (students[0]?.id ?? ''));
  const [bloodType, setBloodType] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [notes, setNotes] = useState('');

  const selectedStudent = useMemo(() => students.find((s) => s.id === studentId), [students, studentId]);

  const mutation = useMutation({
    mutationFn: () =>
      disciplineHealthApi.upsertHealthRecord({
        schoolId: selectedStudent?.schoolId ?? schools[0]?.id ?? '',
        studentId,
        bloodType: bloodType || undefined,
        allergies: allergies || undefined,
        conditions: conditions || undefined,
        medications: medications || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Student health record updated');
      onSuccess(studentId);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update health record');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>Update Student Medical Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Student *</Label>
            <select
              aria-label="Select student for medical profile update"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.studentNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Blood Type</Label>
              <select
                aria-label="Select blood type"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div>
              <Label>Known Allergies</Label>
              <Input
                placeholder="Penicillin, Peanuts, Pollen"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Chronic Conditions</Label>
            <Input
              placeholder="Asthma, Type 1 Diabetes, Epilepsy"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
            />
          </div>

          <div>
            <Label>Current Medications</Label>
            <Input
              placeholder="Inhaler (Albuterol) kept with nurse"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
            />
          </div>

          <div>
            <Label>Confidential Nurse Notes</Label>
            <textarea
              rows={2}
              placeholder="Additional notes for medical emergencies..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !studentId}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Medical Record
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
