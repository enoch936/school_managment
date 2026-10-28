import { api, apiRequestWithMeta } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/api/types';
import type { DisciplineCase, HealthRecord } from '@/lib/api/domain';

export interface DisciplineListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  studentId?: string;
  status?: string;
  schoolId?: string;
}

export interface DisciplineListResult {
  data: DisciplineCase[];
  meta: PaginationMeta;
}

export const disciplineHealthApi = {
  listCases: (params: DisciplineListParams): Promise<DisciplineListResult> =>
    apiRequestWithMeta<DisciplineCase>('/discipline-cases', { query: { ...params } }),
  createCase: (payload: Record<string, unknown>) =>
    api.post<DisciplineCase>('/discipline-cases', payload),
  updateCase: (id: string, payload: Record<string, unknown>) =>
    api.patch<DisciplineCase>(`/discipline-cases/${id}`, payload),

  getHealthRecord: (studentId: string) =>
    api.get<HealthRecord>(`/health-records/students/${studentId}`),
  upsertHealthRecord: (payload: Record<string, unknown>) =>
    api.put<HealthRecord>('/health-records', payload),
};
