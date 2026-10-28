import { api, apiRequestWithMeta } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/api/types';
import type { StaffMember, Teacher, TeacherAssignment } from '@/lib/api/domain';

export interface StaffListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  schoolId?: string;
  departmentId?: string;
}

export interface StaffListResult {
  data: StaffMember[];
  meta: PaginationMeta;
}

export interface TeacherListResult {
  data: Teacher[];
  meta: PaginationMeta;
}

export const staffApi = {
  listStaff: (params: StaffListParams): Promise<StaffListResult> =>
    apiRequestWithMeta<StaffMember>('/staff', { query: { ...params } }),
  createStaff: (payload: Record<string, unknown>) => api.post<StaffMember>('/staff', payload),

  listTeachers: (params: StaffListParams): Promise<TeacherListResult> =>
    apiRequestWithMeta<Teacher>('/teachers', { query: { ...params } }),
  createTeacher: (payload: Record<string, unknown>) => api.post<Teacher>('/teachers', payload),

  assignTeacher: (payload: Record<string, unknown>) =>
    api.post<TeacherAssignment>('/teachers/assignments', payload),
  getTeacherAssignments: (teacherId: string) =>
    api.get<TeacherAssignment[]>(`/teachers/${teacherId}/assignments`),
};
