'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Trash2,
  Loader2,
  Download,
  Upload,
  Copy,
  Printer,
  Sparkles,
  CheckCircle2,
  GraduationCap,
  ArrowRightLeft,
  UserCheck,
  UserX,
  FileText,
  IdCard,
  Phone,
  Mail,
  MapPin,
  Heart,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  studentsApi,
  type DuplicateCluster,
  type StudentDetail,
  type StudentIdCardData,
} from '@/features/students/api';
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
  const activeSchoolId = useAuthStore((s) => s.activeSchoolId);
  const canManage = hasPermission('student:manage');

  // Filter and pagination state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StudentStatus | ''>('');
  const [genderFilter, setGenderFilter] = useState('');
  const [campusFilter, _setCampusFilter] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);

  // Selected student for Profile View / ID Card / Lifecycle Actions
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'guardians' | 'academics' | 'documents' | 'idcard' | 'lifecycle'>('overview');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkPromoteModal, setShowBulkPromoteModal] = useState(false);

  // Lifecycle sub-modals
  const [lifecycleAction, setLifecycleAction] = useState<'enroll' | 'transfer' | 'promote' | 'withdraw' | 'graduate' | null>(null);

  // Multi-selection for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Queries
  const studentsQuery = useQuery({
    queryKey: ['students', { page, search: debouncedSearch, status, gender: genderFilter, campusId: campusFilter }],
    queryFn: () =>
      studentsApi.list({
        page,
        pageSize: 15,
        search: debouncedSearch || undefined,
        status: status || undefined,
        gender: genderFilter || undefined,
        campusId: campusFilter || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: schoolsApi.listWithMeta,
    staleTime: 5 * 60 * 1000,
  });

  const selectedStudentQuery = useQuery({
    queryKey: ['student', selectedStudentId],
    queryFn: () => studentsApi.get(selectedStudentId!),
    enabled: Boolean(selectedStudentId),
  });

  const idCardQuery = useQuery({
    queryKey: ['student-id-card', selectedStudentId],
    queryFn: () => studentsApi.getIdCard(selectedStudentId!),
    enabled: Boolean(selectedStudentId && profileTab === 'idcard'),
  });

  const duplicatesQuery = useQuery({
    queryKey: ['student-duplicates', activeSchoolId],
    queryFn: () => studentsApi.detectDuplicates(activeSchoolId ?? undefined),
    enabled: showDuplicateModal,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsApi.remove(id),
    onSuccess: () => {
      toast.success('Student record archived');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      if (selectedStudentId) setSelectedStudentId(null);
    },
    onError: () => toast.error('Unable to archive student'),
  });

  const meta = studentsQuery.data?.meta;
  const rows = studentsQuery.data?.data ?? [];
  const schools = useMemo(() => schoolsQuery.data?.data ?? [], [schoolsQuery.data]);
  const currentSchoolId = activeSchoolId ?? schools[0]?.id;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(rows.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Global Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Student Information System (SIS)</h1>
          <p className="text-sm text-muted-foreground">
            Complete student directory, lifecycle management, guardian relationships, ID cards, and record merging.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowDuplicateModal(true)} className="gap-1.5">
                <Copy className="h-4 w-4 text-amber-500" /> Duplicate Scanner
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} className="gap-1.5">
                <Upload className="h-4 w-4 text-blue-500" /> Bulk Import / Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowBulkPromoteModal(true)} className="gap-1.5">
                <GraduationCap className="h-4 w-4 text-emerald-500" /> Bulk Promotion
              </Button>
              <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Student
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, student number, national ID, phone, email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <div>
              <select
                aria-label="Filter by enrollment status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as StudentStatus | '');
                  setPage(1);
                }}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="APPLICANT">Applicant</option>
                <option value="TRANSFERRED">Transferred</option>
                <option value="WITHDRAWN">Withdrawn</option>
                <option value="GRADUATED">Graduated</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            <div>
              <select
                aria-label="Filter by gender"
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="UNDISCLOSED">Undisclosed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => {
                  const url = studentsApi.exportCsvUrl({
                    search: debouncedSearch || undefined,
                    status: status || undefined,
                    gender: genderFilter || undefined,
                  });
                  window.open(url, '_blank');
                }}
              >
                <Download className="h-4 w-4 text-muted-foreground" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Action Bar if rows are checked */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/60 rounded-lg border border-border">
          <span className="text-sm font-medium">
            {selectedIds.length} {selectedIds.length === 1 ? 'student' : 'students'} selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBulkPromoteModal(true)}
              className="gap-1.5"
            >
              <GraduationCap className="h-4 w-4 text-emerald-500" /> Promote Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Students Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all students on page"
                    checked={rows.length > 0 && selectedIds.length === rows.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class & Campus</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Guardians & Emergency</TableHead>
                <TableHead>DOB & Gender</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-44" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No student records found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((student) => {
                  const activeEnrollment = student.enrollments?.[0];
                  const primaryGuardian = student.guardians?.find((g) => g.isPrimary) ?? student.guardians?.[0];

                  return (
                    <TableRow key={student.id} className="cursor-pointer hover:bg-muted/40">
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select student ${student.firstName} ${student.lastName}`}
                          checked={selectedIds.includes(student.id)}
                          onChange={() => handleToggleRow(student.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell onClick={() => { setSelectedStudentId(student.id); setProfileTab('overview'); }}>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0 overflow-hidden">
                            {student.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={student.photoUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              `${student.firstName[0]}${student.lastName[0]}`
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-foreground hover:underline">
                              {student.firstName} {student.middleName ? student.middleName + ' ' : ''}{student.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>{student.studentNumber}</span>
                              {student.nationalId && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                                  ID: {student.nationalId}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => { setSelectedStudentId(student.id); setProfileTab('overview'); }}>
                        <div>
                          <div className="font-medium text-sm">
                            {activeEnrollment?.class?.name ?? 'Not Enrolled'}
                            {activeEnrollment?.section?.name ? ` - ${activeEnrollment.section.name}` : ''}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {student.campus?.name ?? 'Main Campus'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => { setSelectedStudentId(student.id); setProfileTab('overview'); }}>
                        <Badge variant={STATUS_VARIANT[student.status] ?? 'secondary'}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={() => { setSelectedStudentId(student.id); setProfileTab('overview'); }}>
                        <div className="text-xs space-y-0.5">
                          {primaryGuardian ? (
                            <div className="font-medium text-foreground">
                              {primaryGuardian.guardian.firstName} {primaryGuardian.guardian.lastName} ({primaryGuardian.relation})
                            </div>
                          ) : student.emergencyContactName ? (
                            <div className="font-medium text-foreground">
                              {student.emergencyContactName} {student.emergencyContactRelation ? `(${student.emergencyContactRelation})` : ''}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">None listed</span>
                          )}
                          <div className="text-muted-foreground">
                            {primaryGuardian?.guardian.phone ?? student.emergencyContactPhone ?? student.phone ?? 'No phone'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => { setSelectedStudentId(student.id); setProfileTab('overview'); }}>
                        <div className="text-xs">
                          <div>{student.dateOfBirth ? formatDate(student.dateOfBirth) : '—'}</div>
                          <div className="text-muted-foreground capitalize">{student.gender.toLowerCase()}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedStudentId(student.id); setProfileTab('idcard'); }}
                            title="Print / View ID Card"
                          >
                            <IdCard className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedStudentId(student.id); setProfileTab('lifecycle'); }}
                            title="Lifecycle Actions"
                          >
                            <ArrowRightLeft className="h-4 w-4 text-emerald-600" />
                          </Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Are you sure you want to archive student ${student.firstName} ${student.lastName}?`)) {
                                  deleteMutation.mutate(student.id);
                                }
                              }}
                              title="Archive Student"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
          <span>Showing page {meta.page} of {meta.totalPages} ({meta.total} students total)</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Advanced Student Profile Drawer / Modal                                    */}
      {/* ========================================================================= */}
      {selectedStudentId && selectedStudentQuery.data && (
        <StudentProfileModal
          student={selectedStudentQuery.data}
          activeTab={profileTab}
          setActiveTab={setProfileTab}
          onClose={() => setSelectedStudentId(null)}
          onRefresh={() => {
            void selectedStudentQuery.refetch();
            void studentsQuery.refetch();
          }}
          idCardData={idCardQuery.data}
          isIdCardLoading={idCardQuery.isLoading}
          onOpenLifecycle={(action) => setLifecycleAction(action)}
        />
      )}

      {/* ========================================================================= */}
      {/* Modal: Add Student                                                        */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <CreateStudentModal
          schoolId={currentSchoolId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            void studentsQuery.refetch();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* Modal: Duplicate Scanner & Controlled Record Merging                      */}
      {/* ========================================================================= */}
      {showDuplicateModal && (
        <DuplicateScannerModal
          clusters={duplicatesQuery.data ?? []}
          isLoading={duplicatesQuery.isLoading}
          onClose={() => setShowDuplicateModal(false)}
          onMergeSuccess={() => {
            void duplicatesQuery.refetch();
            void studentsQuery.refetch();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* Modal: Bulk Import / Export                                               */}
      {/* ========================================================================= */}
      {showImportModal && (
        <BulkImportModal
          schoolId={currentSchoolId}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            void studentsQuery.refetch();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* Modal: Bulk Promotion                                                     */}
      {/* ========================================================================= */}
      {showBulkPromoteModal && (
        <BulkPromoteModal
          _schoolId={currentSchoolId}
          studentIds={selectedIds}
          onClose={() => setShowBulkPromoteModal(false)}
          onSuccess={() => {
            setShowBulkPromoteModal(false);
            setSelectedIds([]);
            void studentsQuery.refetch();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* Sub-Modal: Individual Lifecycle Action (Transfer, Promote, Withdraw, etc) */}
      {/* ========================================================================= */}
      {lifecycleAction && selectedStudentId && selectedStudentQuery.data && (
        <LifecycleActionModal
          action={lifecycleAction}
          student={selectedStudentQuery.data}
          onClose={() => setLifecycleAction(null)}
          onSuccess={() => {
            setLifecycleAction(null);
            void selectedStudentQuery.refetch();
            void studentsQuery.refetch();
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// Student Profile Modal Component (Tabs: Overview, Guardians, Academics, ID Card, Docs)
// =============================================================================
function StudentProfileModal({
  student,
  activeTab,
  setActiveTab,
  onClose,
  onRefresh,
  idCardData,
  isIdCardLoading,
  onOpenLifecycle,
}: {
  student: StudentDetail;
  activeTab: 'overview' | 'guardians' | 'academics' | 'documents' | 'idcard' | 'lifecycle';
  setActiveTab: (t: 'overview' | 'guardians' | 'academics' | 'documents' | 'idcard' | 'lifecycle') => void;
  onClose: () => void;
  onRefresh: () => void;
  idCardData?: StudentIdCardData;
  isIdCardLoading: boolean;
  onOpenLifecycle: (action: 'enroll' | 'transfer' | 'promote' | 'withdraw' | 'graduate') => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: student.firstName,
    middleName: student.middleName ?? '',
    lastName: student.lastName,
    nationalId: student.nationalId ?? '',
    birthCertificateNo: student.birthCertificateNo ?? '',
    bloodGroup: student.bloodGroup ?? '',
    religion: student.religion ?? '',
    motherTongue: student.motherTongue ?? '',
    phone: student.phone ?? '',
    email: student.email ?? '',
    address: student.address ?? '',
    emergencyContactName: student.emergencyContactName ?? '',
    emergencyContactRelation: student.emergencyContactRelation ?? '',
    emergencyContactPhone: student.emergencyContactPhone ?? '',
    emergencyContactSecondaryPhone: student.emergencyContactSecondaryPhone ?? '',
    medicalNotes: student.medicalNotes ?? '',
    previousSchool: student.previousSchool ?? '',
    previousSchoolGrade: student.previousSchoolGrade ?? '',
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => studentsApi.update(student.id, payload),
    onSuccess: () => {
      toast.success('Student profile updated');
      setIsEditing(false);
      onRefresh();
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Update failed'),
  });

  const uploadDocMutation = useMutation({
    mutationFn: (payload: { type: string; title: string; storageKey: string }) =>
      studentsApi.addDocument(student.id, payload),
    onSuccess: () => {
      toast.success('Document uploaded');
      onRefresh();
    },
    onError: () => toast.error('Upload failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
      <Card className="w-full max-w-5xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header with Photo, Basic Details, and Quick Actions */}
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-lg overflow-hidden shrink-0">
                {student.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={student.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  `${student.firstName[0]}${student.lastName[0]}`
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">
                    {student.firstName} {student.middleName ? student.middleName + ' ' : ''}{student.lastName}
                  </h2>
                  <Badge variant={STATUS_VARIANT[student.status] ?? 'secondary'}>
                    {student.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <span>Number: <strong className="text-foreground">{student.studentNumber}</strong></span>
                  {student.nationalId && <span>National ID: <strong className="text-foreground">{student.nationalId}</strong></span>}
                  <span>Campus: <strong className="text-foreground">{student.campus?.name ?? 'Main Campus'}</strong></span>
                  <span>School: <strong className="text-foreground">{student.school.name}</strong></span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setActiveTab('idcard')} className="gap-1.5">
                <Printer className="h-4 w-4" /> Print ID Card
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                ✕
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-border pt-4 -mb-4 overflow-x-auto">
            {(
              [
                { id: 'overview', label: 'Demographics & Contacts', icon: UserCheck },
                { id: 'guardians', label: `Guardians (${student.guardians.length})`, icon: Heart },
                { id: 'academics', label: `Enrollment Trail (${student.enrollments.length})`, icon: BookOpen },
                { id: 'documents', label: `Documents (${student.documents.length})`, icon: FileText },
                { id: 'idcard', label: 'ID Card Badge', icon: IdCard },
                { id: 'lifecycle', label: 'Lifecycle Actions', icon: ArrowRightLeft },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
                    activeTab === t.id
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </CardHeader>

        {/* Tab Content Area */}
        <CardContent className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: Demographics & Contacts */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold">Personal & Demographic Details</h3>
                <Button size="sm" variant="outline" onClick={() => setIsEditing((v) => !v)}>
                  {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                </Button>
              </div>

              {isEditing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMutation.mutate(editForm);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input
                        value={editForm.firstName}
                        onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label>Middle Name</Label>
                      <Input
                        value={editForm.middleName}
                        onChange={(e) => setEditForm((p) => ({ ...p, middleName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input
                        value={editForm.lastName}
                        onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>National ID</Label>
                      <Input
                        value={editForm.nationalId}
                        onChange={(e) => setEditForm((p) => ({ ...p, nationalId: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Birth Certificate No</Label>
                      <Input
                        value={editForm.birthCertificateNo}
                        onChange={(e) => setEditForm((p) => ({ ...p, birthCertificateNo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Blood Group</Label>
                      <Input
                        value={editForm.bloodGroup}
                        onChange={(e) => setEditForm((p) => ({ ...p, bloodGroup: e.target.value }))}
                        placeholder="e.g. O+, A-, B+"
                      />
                    </div>
                    <div>
                      <Label>Mother Tongue</Label>
                      <Input
                        value={editForm.motherTongue}
                        onChange={(e) => setEditForm((p) => ({ ...p, motherTongue: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3">Emergency Contact Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Emergency Contact Name</Label>
                        <Input
                          value={editForm.emergencyContactName}
                          onChange={(e) => setEditForm((p) => ({ ...p, emergencyContactName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Relation</Label>
                        <Input
                          value={editForm.emergencyContactRelation}
                          onChange={(e) => setEditForm((p) => ({ ...p, emergencyContactRelation: e.target.value }))}
                          placeholder="e.g. Uncle, Grandmother"
                        />
                      </div>
                      <div>
                        <Label>Emergency Phone</Label>
                        <Input
                          value={editForm.emergencyContactPhone}
                          onChange={(e) => setEditForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3">Medical Notes & Previous School</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Medical / Allergy Notes</Label>
                        <Input
                          value={editForm.medicalNotes}
                          onChange={(e) => setEditForm((p) => ({ ...p, medicalNotes: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Previous School Attended</Label>
                        <Input
                          value={editForm.previousSchool}
                          onChange={(e) => setEditForm((p) => ({ ...p, previousSchool: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-3 p-4 bg-muted/20 rounded-lg border">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Demographics</h4>
                    <div className="text-sm space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gender:</span>
                        <span className="font-medium capitalize">{student.gender.toLowerCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date of Birth:</span>
                        <span className="font-medium">{student.dateOfBirth ? formatDate(student.dateOfBirth) : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">National ID:</span>
                        <span className="font-medium">{student.nationalId ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Birth Cert No:</span>
                        <span className="font-medium">{student.birthCertificateNo ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Blood Group:</span>
                        <span className="font-medium">{student.bloodGroup ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mother Tongue:</span>
                        <span className="font-medium">{student.motherTongue ?? '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-muted/20 rounded-lg border">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emergency Contacts</h4>
                    <div className="text-sm space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contact:</span>
                        <span className="font-medium">{student.emergencyContactName ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Relation:</span>
                        <span className="font-medium">{student.emergencyContactRelation ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Primary Phone:</span>
                        <span className="font-medium">{student.emergencyContactPhone ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Secondary Phone:</span>
                        <span className="font-medium">{student.emergencyContactSecondaryPhone ?? '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-muted/20 rounded-lg border">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prior Academic History</h4>
                    <div className="text-sm space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Previous School:</span>
                        <span className="font-medium">{student.previousSchool ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Previous Grade:</span>
                        <span className="font-medium">{student.previousSchoolGrade ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Enrolled Date:</span>
                        <span className="font-medium">{student.enrollmentDate ? formatDate(student.enrollmentDate) : '—'}</span>
                      </div>
                      {student.medicalNotes && (
                        <div className="pt-2 border-t">
                          <span className="text-xs text-muted-foreground block">Medical Alerts:</span>
                          <span className="text-xs text-destructive font-medium">{student.medicalNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Guardians */}
          {activeTab === 'guardians' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold">Authorized Guardians & Parents</h3>
              </div>

              {student.guardians.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg">
                  No guardians linked to this student yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {student.guardians.map((g) => (
                    <Card key={g.id} className="p-4 border">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base">
                              {g.guardian.firstName} {g.guardian.lastName}
                            </span>
                            <Badge variant="outline">{g.relation}</Badge>
                            {g.isPrimary && <Badge variant="default" className="text-[10px]">Primary</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2 space-y-1">
                            {g.guardian.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {g.guardian.phone}</div>}
                            {g.guardian.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {g.guardian.email}</div>}
                            {g.guardian.address && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {g.guardian.address}</div>}
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          {g.isLegalGuardian && <Badge variant="secondary" className="text-[10px] block">Legal Guardian</Badge>}
                          {g.canPickup && <Badge variant="secondary" className="text-[10px] block">Pickup Authorized</Badge>}
                          {g.hasPortalAccess && <Badge variant="secondary" className="text-[10px] block">Portal Access</Badge>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Academic & Enrollment Trail */}
          {activeTab === 'academics' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Enrollment & Academic History Trail</h3>
              {student.enrollments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg">
                  No historical enrollment records found.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Academic Year</TableHead>
                        <TableHead>Class & Section</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Enrolled Date</TableHead>
                        <TableHead>Completed Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.enrollments.map((enr) => (
                        <TableRow key={enr.id}>
                          <TableCell className="font-medium">
                            {enr.academicYear.name}
                            {enr.academicYear.isCurrent && (
                              <Badge variant="outline" className="ml-2 text-[10px] text-primary border-primary">
                                Current
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {enr.class.name} {enr.section?.name ? `(${enr.section.name})` : ''}
                          </TableCell>
                          <TableCell>{enr.rollNumber ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={enr.status === 'ACTIVE' ? 'success' : 'secondary'}>
                              {enr.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(enr.enrolledAt)}</TableCell>
                          <TableCell>{enr.completedAt ? formatDate(enr.completedAt) : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold">Authorized Documents & Records</h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    const title = prompt('Document Title:');
                    if (!title) return;
                    const type = prompt('Document Type (TRANSCRIPT, CERTIFICATE, MEDICAL_REPORT, OTHER):', 'TRANSCRIPT') || 'OTHER';
                    uploadDocMutation.mutate({
                      title,
                      type,
                      storageKey: `https://storage.sms.edu/docs/${student.id}/${Date.now()}-${title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
                    });
                  }}
                >
                  <Upload className="h-4 w-4" /> Upload Document
                </Button>
              </div>

              {student.documents.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg">
                  No documents attached to this student record.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {student.documents.map((doc) => (
                    <div key={doc.id} className="p-3 border rounded-lg flex items-center justify-between bg-card">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{doc.title}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>{doc.type}</span>
                            <span>•</span>
                            <span>{formatDate(doc.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{doc.sensitivity}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Scannable Student ID Card */}
          {activeTab === 'idcard' && (
            <div className="space-y-6 flex flex-col items-center">
              <div className="w-full flex justify-between items-center max-w-md">
                <h3 className="text-base font-semibold">Standardized Student ID Badge</h3>
                <Button size="sm" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="h-4 w-4" /> Print Badge
                </Button>
              </div>

              {isIdCardLoading || !idCardData ? (
                <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
              ) : (
                <div className="w-full max-w-sm rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-background to-muted shadow-xl overflow-hidden print:m-0 print:shadow-none">
                  {/* Card Header */}
                  <div className="bg-primary text-primary-foreground p-4 text-center">
                    <div className="font-bold text-lg tracking-wide uppercase">{idCardData.schoolName}</div>
                    <div className="text-xs opacity-90">{idCardData.campusName} • Student Identity Card</div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex flex-col items-center text-center space-y-4">
                    <div className="h-28 w-28 rounded-full border-4 border-background shadow-md overflow-hidden bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                      {idCardData.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={idCardData.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        idCardData.fullName.split(' ').map((n) => n[0]).join('')
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-lg leading-tight">{idCardData.fullName}</h4>
                      <p className="text-sm font-semibold text-primary mt-0.5">{idCardData.className} {idCardData.sectionName}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">ID: {idCardData.studentNumber}</p>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-2 text-left bg-background/80 p-3 rounded-lg border text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">BLOOD GROUP</span>
                        <strong className="text-foreground">{idCardData.bloodGroup}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">EMERGENCY PHONE</span>
                        <strong className="text-foreground">{idCardData.emergencyContactPhone ?? 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">ISSUED</span>
                        <span>{formatDate(idCardData.issuedAt)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">EXPIRES</span>
                        <span>{formatDate(idCardData.expiresAt)}</span>
                      </div>
                    </div>

                    {/* Barcode representation */}
                    <div className="pt-2 flex flex-col items-center">
                      <div className="font-mono text-[9px] tracking-widest bg-muted px-3 py-1 rounded border">
                        ||||| | |||| ||| ||||| || |||||| | |||||
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground mt-1">
                        {idCardData.barcodePayload}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Lifecycle Actions */}
          {activeTab === 'lifecycle' && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold">Student Lifecycle Transition Workflows</h3>
              <p className="text-xs text-muted-foreground -mt-4">
                Execute controlled institutional transitions with complete validation, campus verification, and audit logging.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-blue-500 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">Class Enrollment</h4>
                      <p className="text-xs text-muted-foreground">Assign or update class, section, roll number, and active academic year.</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => onOpenLifecycle('enroll')}>
                    Enroll In Class
                  </Button>
                </Card>

                <Card className="p-4 border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft className="h-8 w-8 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">Campus / School Transfer</h4>
                      <p className="text-xs text-muted-foreground">Transfer student internally to another branch campus or record external transfer.</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => onOpenLifecycle('transfer')}>
                    Transfer Student
                  </Button>
                </Card>

                <Card className="p-4 border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-8 w-8 text-purple-500 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">Class Promotion</h4>
                      <p className="text-xs text-muted-foreground">Promote student to the next academic year and higher grade level.</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => onOpenLifecycle('promote')}>
                    Promote Student
                  </Button>
                </Card>

                <Card className="p-4 border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <UserX className="h-8 w-8 text-destructive shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">Student Withdrawal</h4>
                      <p className="text-xs text-muted-foreground">Withdraw student with exit reason, exit date, and clearance completion.</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => onOpenLifecycle('withdraw')}>
                    Process Withdrawal
                  </Button>
                </Card>

                <Card className="p-4 border hover:border-primary/50 transition-colors md:col-span-2">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-amber-500 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">Graduation Completion</h4>
                      <p className="text-xs text-muted-foreground">Mark student as graduated, archive active enrollments, and award graduation honors.</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => onOpenLifecycle('graduate')}>
                    Graduate Student
                  </Button>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Modal: Create Student
// =============================================================================
function CreateStudentModal({
  schoolId,
  onClose,
  onSuccess,
}: {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    schoolId,
    studentNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
    nationalId: '',
    bloodGroup: '',
    email: '',
    phone: '',
    address: '',
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    previousSchool: '',
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => studentsApi.create(payload),
    onSuccess: () => {
      toast.success('Student registered successfully');
      onSuccess();
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Registration failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
      <Card className="w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle>Register New Student</CardTitle>
          <CardDescription>Enter demographic, emergency contact, and previous school information.</CardDescription>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(form);
          }}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>First Name *</Label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Middle Name</Label>
              <Input
                value={form.middleName}
                onChange={(e) => setForm((p) => ({ ...p, middleName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Student Number (Optional)</Label>
              <Input
                placeholder="Auto-generated if blank"
                value={form.studentNumber}
                onChange={(e) => setForm((p) => ({ ...p, studentNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label>Gender</Label>
              <select
                aria-label="Student gender"
                value={form.gender}
                onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="UNDISCLOSED">Undisclosed</option>
              </select>
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>National ID</Label>
              <Input
                value={form.nationalId}
                onChange={(e) => setForm((p) => ({ ...p, nationalId: e.target.value }))}
              />
            </div>
            <div>
              <Label>Blood Group</Label>
              <Input
                placeholder="e.g. O+, A+"
                value={form.bloodGroup}
                onChange={(e) => setForm((p) => ({ ...p, bloodGroup: e.target.value }))}
              />
            </div>
            <div>
              <Label>Primary Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Emergency Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Contact Name</Label>
                <Input
                  value={form.emergencyContactName}
                  onChange={(e) => setForm((p) => ({ ...p, emergencyContactName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Relation</Label>
                <Input
                  placeholder="e.g. Mother, Uncle"
                  value={form.emergencyContactRelation}
                  onChange={(e) => setForm((p) => ({ ...p, emergencyContactRelation: e.target.value }))}
                />
              </div>
              <div>
                <Label>Emergency Phone</Label>
                <Input
                  value={form.emergencyContactPhone}
                  onChange={(e) => setForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              Register Student
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// =============================================================================
// Modal: Duplicate Scanner & Controlled Record Merging
// =============================================================================
function DuplicateScannerModal({
  clusters,
  isLoading,
  onClose,
  onMergeSuccess,
}: {
  clusters: DuplicateCluster[];
  isLoading: boolean;
  onClose: () => void;
  onMergeSuccess: () => void;
}) {
  const [selectedCluster, setSelectedCluster] = useState<DuplicateCluster | null>(null);
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [sourceStudentId, setSourceStudentId] = useState<string>('');

  const mergeMutation = useMutation({
    mutationFn: (payload: { sourceStudentId: string; targetStudentId: string; notes?: string }) =>
      studentsApi.merge(payload),
    onSuccess: () => {
      toast.success('Records successfully merged');
      setSelectedCluster(null);
      onMergeSuccess();
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Merge failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
      <Card className="w-full max-w-4xl shadow-xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-amber-500" /> Duplicate Record Scanner & Resolver
          </CardTitle>
          <CardDescription>
            Scans for potential duplicate students using multi-factor heuristics (National ID, contact, name & DOB).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
          ) : clusters.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-foreground">No duplicate records detected!</p>
              <p className="text-xs">Your student records are unique across national IDs, contacts, and names.</p>
            </div>
          ) : selectedCluster ? (
            <div className="space-y-4">
              <Button size="sm" variant="ghost" onClick={() => setSelectedCluster(null)}>
                ← Back to Duplicate Clusters
              </Button>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <h4 className="font-semibold text-sm text-amber-700 dark:text-amber-400">
                  Merge Duplicate Pair ({selectedCluster.matchType} • {selectedCluster.confidence}% match)
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose which record to KEEP (Target). All enrollments, attendance, documents, and invoices from the source will be safely re-linked into the target record.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedCluster.students.map((stu: DuplicateCluster['students'][number]) => (
                  <Card
                    key={stu.id}
                    className={cn(
                      'p-4 border-2 cursor-pointer transition-all',
                      targetStudentId === stu.id
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : 'border-border'
                    )}
                    onClick={() => {
                      setTargetStudentId(stu.id);
                      const other = selectedCluster.students.find(
                        (s: DuplicateCluster['students'][number]) => s.id !== stu.id,
                      );
                      if (other) setSourceStudentId(other.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold">{stu.firstName} {stu.lastName}</h5>
                      {targetStudentId === stu.id && (
                        <Badge variant="success" className="text-[10px]">KEEP THIS (TARGET)</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <div>Number: <strong>{stu.studentNumber}</strong></div>
                      <div>Status: <Badge variant="secondary" className="text-[10px]">{stu.status}</Badge></div>
                      <div>National ID: {stu.nationalId ?? '—'}</div>
                      <div>DOB: {stu.dateOfBirth ? formatDate(stu.dateOfBirth) : '—'}</div>
                      <div>Phone: {stu.phone ?? '—'}</div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedCluster(null)}>Cancel</Button>
                <Button
                  disabled={!targetStudentId || !sourceStudentId || mergeMutation.isPending}
                  onClick={() => {
                    if (confirm('Confirm merge? The secondary record will be permanently archived.')) {
                      mergeMutation.mutate({ sourceStudentId, targetStudentId });
                    }
                  }}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" /> Confirm & Merge Records
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {clusters.map((cluster) => (
                <div
                  key={cluster.clusterKey}
                  className="p-4 border rounded-lg flex items-center justify-between bg-card hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {cluster.students[0]?.firstName} {cluster.students[0]?.lastName}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{cluster.matchType}</Badge>
                      <Badge variant={cluster.confidence >= 90 ? 'destructive' : 'warning'} className="text-[10px]">
                        {cluster.confidence}% Confidence
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Records: {cluster.students.map((s: DuplicateCluster['students'][number]) => `${s.studentNumber} (${s.status})`).join(' vs ')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCluster(cluster);
                      setTargetStudentId(cluster.students[0]?.id);
                      setSourceStudentId(cluster.students[1]?.id);
                    }}
                  >
                    Resolve & Merge
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <div className="flex justify-end p-4 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// Modal: Bulk Import / Export
// =============================================================================
function BulkImportModal({
  schoolId,
  onClose,
  onSuccess,
}: {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [csvText, setCsvText] = useState(
    'FirstName,LastName,Gender,Email,Phone,NationalId,EmergencyName,EmergencyPhone\n' +
    'Alem,Tadesse,MALE,alem@test.com,+251911000001,NAT-2001,Tadesse Mengistu,+251911000002\n' +
    'Bethlehem,Kebede,FEMALE,beth@test.com,+251911000003,NAT-2002,Kebede Assefa,+251911000004'
  );

  const importMutation = useMutation({
    mutationFn: async () => {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV must have header and at least one data row');

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const students = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length < 2) continue;

        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = parts[idx] ?? '';
        });

        students.push({
          firstName: row['firstname'] || parts[0],
          lastName: row['lastname'] || parts[1],
          gender: (row['gender'] || 'MALE').toUpperCase(),
          email: row['email'],
          phone: row['phone'],
          nationalId: row['nationalid'],
          emergencyContactName: row['emergencyname'],
          emergencyContactPhone: row['emergencyphone'],
        });
      }

      return studentsApi.bulkImport({ schoolId, students });
    },
    onSuccess: (res) => {
      toast.success(`Import complete! ${res.importedCount} of ${res.total} students imported.`);
      if (res.errorCount > 0) {
        toast.warning(`${res.errorCount} rows had errors and were skipped.`);
      }
      onSuccess();
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Import failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
      <Card className="w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" /> Bulk Student Import (CSV)
          </CardTitle>
          <CardDescription>
            Paste comma-separated student rows or load template to import students in batches.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <Label>CSV Data</Label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={10}
              className="w-full font-mono text-xs p-3 rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Supported columns: FirstName, LastName, Gender, Email, Phone, NationalId, EmergencyName, EmergencyPhone.
          </p>
        </CardContent>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending} className="gap-2">
            <Upload className="h-4 w-4" /> Import Students
          </Button>
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// Modal: Bulk Promotion
// =============================================================================
function BulkPromoteModal({
  _schoolId,
  studentIds,
  onClose,
  onSuccess,
}: {
  _schoolId: string;
  studentIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [targetAcademicYearId, setTargetAcademicYearId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [notes, setNotes] = useState('');

  const bulkPromoteMutation = useMutation({
    mutationFn: (payload: { studentIds: string[]; targetAcademicYearId: string; targetClassId: string; notes?: string }) =>
      studentsApi.bulkPromote(payload),
    onSuccess: (res) => {
      toast.success(`${res.promotedCount} students successfully promoted`);
      onSuccess();
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Promotion failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-emerald-500" /> Bulk Student Promotion
          </CardTitle>
          <CardDescription>
            Promote {studentIds.length} selected student(s) to the next academic year and grade level.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Target Academic Year ID *</Label>
            <Input
              value={targetAcademicYearId}
              onChange={(e) => setTargetAcademicYearId(e.target.value)}
              placeholder="e.g. UUID of 2026-2027 Academic Year"
              required
            />
          </div>
          <div>
            <Label>Target Class ID *</Label>
            <Input
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              placeholder="e.g. UUID of Grade 6 Class"
              required
            />
          </div>
          <div>
            <Label>Promotion Notes (Optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. End of year academic promotion"
            />
          </div>
        </CardContent>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => bulkPromoteMutation.mutate({ studentIds, targetAcademicYearId, targetClassId, notes })}
            disabled={!targetAcademicYearId || !targetClassId || bulkPromoteMutation.isPending}
            className="gap-2"
          >
            <GraduationCap className="h-4 w-4" /> Execute Promotion
          </Button>
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// Modal: Lifecycle Action (Enroll, Transfer, Promote, Withdraw, Graduate)
// =============================================================================
function LifecycleActionModal({
  action,
  student,
  onClose,
  onSuccess,
}: {
  action: 'enroll' | 'transfer' | 'promote' | 'withdraw' | 'graduate';
  student: StudentDetail;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [param1, setParam1] = useState('');
  const [param2, setParam2] = useState('');
  const [param3, setParam3] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (action === 'enroll') {
        return studentsApi.enroll(student.id, {
          academicYearId: param1,
          classId: param2,
          rollNumber: param3 ? parseInt(param3, 10) : undefined,
        });
      } else if (action === 'transfer') {
        return studentsApi.transfer(student.id, {
          transferReason: param1,
          externalSchoolName: param2 || undefined,
          targetCampusId: param3 || undefined,
        });
      } else if (action === 'promote') {
        return studentsApi.promote(student.id, {
          targetAcademicYearId: param1,
          targetClassId: param2,
          notes: param3 || undefined,
        });
      } else if (action === 'withdraw') {
        return studentsApi.withdraw(student.id, {
          withdrawalReason: param1,
          clearanceCompleted: true,
        });
      } else if (action === 'graduate') {
        return studentsApi.graduate(student.id, {
          honors: param1 || undefined,
          notes: param2 || undefined,
        });
      }
    },
    onSuccess: () => {
      toast.success(`Student action completed: ${action.toUpperCase()}`);
      onSuccess();
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Action failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="border-b">
          <CardTitle className="capitalize">
            {action} Student: {student.firstName} {student.lastName}
          </CardTitle>
          <CardDescription>
            {action === 'enroll' && 'Assign student to an academic year, class, and section.'}
            {action === 'transfer' && 'Record transfer reason, target campus, or destination school.'}
            {action === 'promote' && 'Promote student to higher academic year and class.'}
            {action === 'withdraw' && 'Process student withdrawal with exit reason.'}
            {action === 'graduate' && 'Mark student as graduated with completion honors.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {action === 'enroll' && (
            <>
              <div>
                <Label>Academic Year ID *</Label>
                <Input value={param1} onChange={(e) => setParam1(e.target.value)} required />
              </div>
              <div>
                <Label>Class ID *</Label>
                <Input value={param2} onChange={(e) => setParam2(e.target.value)} required />
              </div>
              <div>
                <Label>Roll Number</Label>
                <Input type="number" value={param3} onChange={(e) => setParam3(e.target.value)} />
              </div>
            </>
          )}

          {action === 'transfer' && (
            <>
              <div>
                <Label>Transfer Reason *</Label>
                <Input value={param1} onChange={(e) => setParam1(e.target.value)} placeholder="e.g. Relocating to new city" required />
              </div>
              <div>
                <Label>External School Destination</Label>
                <Input value={param2} onChange={(e) => setParam2(e.target.value)} placeholder="Leave blank if internal campus transfer" />
              </div>
              <div>
                <Label>Target Campus ID</Label>
                <Input value={param3} onChange={(e) => setParam3(e.target.value)} placeholder="Leave blank if external school" />
              </div>
            </>
          )}

          {action === 'promote' && (
            <>
              <div>
                <Label>Target Academic Year ID *</Label>
                <Input value={param1} onChange={(e) => setParam1(e.target.value)} required />
              </div>
              <div>
                <Label>Target Class ID *</Label>
                <Input value={param2} onChange={(e) => setParam2(e.target.value)} required />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={param3} onChange={(e) => setParam3(e.target.value)} />
              </div>
            </>
          )}

          {action === 'withdraw' && (
            <div>
              <Label>Withdrawal Reason *</Label>
              <Input value={param1} onChange={(e) => setParam1(e.target.value)} placeholder="e.g. Family relocation, personal reasons" required />
            </div>
          )}

          {action === 'graduate' && (
            <>
              <div>
                <Label>Honors / Accolades</Label>
                <Input value={param1} onChange={(e) => setParam1(e.target.value)} placeholder="e.g. Magna Cum Laude, Valedictorian" />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={param2} onChange={(e) => setParam2(e.target.value)} />
              </div>
            </>
          )}
        </CardContent>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Confirm Action
          </Button>
        </div>
      </Card>
    </div>
  );
}
