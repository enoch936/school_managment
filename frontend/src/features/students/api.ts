import { api, apiRequestWithMeta } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/api/types';
import type { Student, StudentStatus } from '@/lib/api/domain';

export interface StudentListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: StudentStatus;
  schoolId?: string;
  classId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StudentListResult {
  data: Student[];
  meta: PaginationMeta;
}

export const studentsApi = {
  list: (params: StudentListParams): Promise<StudentListResult> =>
    apiRequestWithMeta<Student>('/students', { query: { ...params } }),
  get: (id: string) => api.get<Student>(`/students/${id}`),
  create: (payload: Record<string, unknown>) => api.post<Student>('/students', payload),
  update: (id: string, payload: Record<string, unknown>) => api.patch<Student>(`/students/${id}`, payload),
  remove: (id: string) => api.delete<{ id: string }>(`/students/${id}`),
};
