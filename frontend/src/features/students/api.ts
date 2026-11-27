import { api, apiRequestWithMeta } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/api/types';
import type { StudentStatus } from '@/lib/api/domain';

export interface StudentListItem {
  id: string;
  schoolId: string;
  campusId?: string | null;
  studentNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNDISCLOSED';
  dateOfBirth?: string | null;
  nationalId?: string | null;
  birthCertificateNo?: string | null;
  bloodGroup?: string | null;
  photoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status: StudentStatus;
  emergencyContactName?: string | null;
  emergencyContactRelation?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactSecondaryPhone?: string | null;
  medicalNotes?: string | null;
  previousSchool?: string | null;
  previousSchoolAddress?: string | null;
  previousSchoolGrade?: string | null;
  religion?: string | null;
  motherTongue?: string | null;
  transferReason?: string | null;
  withdrawalReason?: string | null;
  withdrawalDate?: string | null;
  graduationDate?: string | null;
  enrollmentDate?: string | null;
  createdAt: string;
  updatedAt: string;
  campus?: { id: string; name: string; code: string } | null;
  enrollments?: Array<{
    id: string;
    classId: string;
    sectionId?: string | null;
    academicYearId: string;
    class?: { id: string; name: string } | null;
    section?: { id: string; name: string } | null;
    academicYear?: { id: string; name: string; isCurrent: boolean } | null;
  }>;
  guardians?: Array<{
    id: string;
    relation: string;
    isPrimary: boolean;
    guardian: {
      id: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
      email?: string | null;
    };
  }>;
}

export interface StudentDetail extends StudentListItem {
  school: {
    id: string;
    name: string;
    code: string;
    logoUrl?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  guardians: Array<{
    id: string;
    guardianId: string;
    relation: string;
    isPrimary: boolean;
    isLegalGuardian: boolean;
    canPickup: boolean;
    hasPortalAccess: boolean;
    guardian: {
      id: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      occupation?: string | null;
    };
  }>;
  enrollments: Array<{
    id: string;
    academicYearId: string;
    classId: string;
    sectionId?: string | null;
    rollNumber?: number | null;
    status: string;
    enrolledAt: string;
    completedAt?: string | null;
    notes?: string | null;
    class: { id: string; name: string };
    section?: { id: string; name: string } | null;
    academicYear: { id: string; name: string; isCurrent: boolean; startDate: string; endDate: string };
  }>;
  documents: Array<{
    id: string;
    type: string;
    title: string;
    storageKey: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
    sensitivity: string;
    createdAt: string;
  }>;
  attendanceRecords: Array<{
    id: string;
    date: string;
    status: string;
    minutesLate?: number | null;
  }>;
}

export interface StudentListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: StudentStatus;
  schoolId?: string;
  campusId?: string;
  classId?: string;
  sectionId?: string;
  academicYearId?: string;
  gender?: string;
  bloodGroup?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StudentListResult {
  data: StudentListItem[];
  meta: PaginationMeta;
}

export interface StudentIdCardData {
  cardId: string;
  studentNumber: string;
  fullName: string;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  schoolName: string;
  schoolCode: string;
  schoolLogo?: string | null;
  campusName: string;
  className: string;
  sectionName: string;
  academicYear: string;
  issuedAt: string;
  expiresAt: string;
  barcodePayload: string;
}

export interface DuplicateCluster {
  clusterKey: string;
  matchType: string;
  confidence: number;
  students: Array<{
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
    phone?: string | null;
    email?: string | null;
    nationalId?: string | null;
    status: string;
    createdAt: string;
  }>;
}

export interface BulkImportResult {
  total: number;
  importedCount: number;
  errorCount: number;
  errors: Array<{ row: number; error: string }>;
}

export interface BulkImportStudentInput {
  firstName: string;
  lastName: string;
  gender?: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export const studentsApi = {
  list: (params: StudentListParams): Promise<StudentListResult> =>
    apiRequestWithMeta<StudentListItem>('/students', { query: { ...params } }),

  get: (id: string) => api.get<StudentDetail>(`/students/${id}`),

  create: (payload: Record<string, unknown>) => api.post<StudentListItem>('/students', payload),

  update: (id: string, payload: Record<string, unknown>) => api.patch<StudentListItem>(`/students/${id}`, payload),

  remove: (id: string) => api.delete<{ id: string }>(`/students/${id}`),

  // Lifecycle
  enroll: (id: string, payload: { academicYearId: string; classId: string; sectionId?: string; rollNumber?: number; enrolledAt?: string; notes?: string }) =>
    api.post(`/students/${id}/enroll`, payload),

  transfer: (id: string, payload: { targetCampusId?: string; externalSchoolName?: string; transferReason: string; transferDate?: string }) =>
    api.post(`/students/${id}/transfer`, payload),

  promote: (id: string, payload: { targetAcademicYearId: string; targetClassId: string; targetSectionId?: string; notes?: string }) =>
    api.post(`/students/${id}/promote`, payload),

  bulkPromote: (payload: { studentIds: string[]; targetAcademicYearId: string; targetClassId: string; targetSectionId?: string; notes?: string }) =>
    api.post<{ promotedCount: number; studentIds: string[] }>('/students/bulk-promote', payload),

  withdraw: (id: string, payload: { withdrawalReason: string; withdrawalDate?: string; clearanceCompleted?: boolean }) =>
    api.post(`/students/${id}/withdraw`, payload),

  graduate: (id: string, payload: { graduationDate?: string; honors?: string; notes?: string }) =>
    api.post(`/students/${id}/graduate`, payload),

  // ID Card & Documents
  getIdCard: (id: string) => api.get<StudentIdCardData>(`/students/${id}/id-card`),

  listDocuments: (id: string) => api.get<Array<{ id: string; type: string; title: string; storageKey: string; sensitivity: string; createdAt: string }>>(`/students/${id}/documents`),

  addDocument: (id: string, payload: { type: string; title: string; storageKey: string; sensitivity?: string; mimeType?: string; sizeBytes?: number }) =>
    api.post(`/students/${id}/documents`, payload),

  removeDocument: (id: string, documentId: string) =>
    api.delete(`/students/${id}/documents/${documentId}`),

  // Guardians
  linkGuardian: (id: string, payload: { guardianId: string; relation: string; isPrimary?: boolean; isLegalGuardian?: boolean; canPickup?: boolean; hasPortalAccess?: boolean }) =>
    api.post(`/students/${id}/guardians`, payload),

  unlinkGuardian: (id: string, guardianId: string) =>
    api.delete(`/students/${id}/guardians/${guardianId}`),

  // Duplicates & Merge
  detectDuplicates: (schoolId?: string) =>
    api.get<DuplicateCluster[]>('/students/duplicates', { query: schoolId ? { schoolId } : undefined }),

  merge: (payload: { sourceStudentId: string; targetStudentId: string; notes?: string }) =>
    api.post<{ message: string; targetId: string; archivedSourceId: string }>('/students/merge', payload),

  // Bulk Import
  bulkImport: (payload: { schoolId: string; campusId?: string; students: BulkImportStudentInput[] }) =>
    api.post<BulkImportResult>('/students/import', payload),

  // Export CSV
  exportCsvUrl: (params?: StudentListParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.set(k, String(v));
        }
      });
    }
    return `/api/v1/students/export/csv?${searchParams.toString()}`;
  },
};
