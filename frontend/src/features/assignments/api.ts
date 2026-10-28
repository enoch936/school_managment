import { api, apiRequestWithMeta } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/api/types';
import type { Assignment, Submission } from '@/lib/api/domain';

export interface AssignmentListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  schoolId?: string;
}

export interface AssignmentListResult {
  data: Assignment[];
  meta: PaginationMeta;
}

export const assignmentsApi = {
  list: (params: AssignmentListParams): Promise<AssignmentListResult> =>
    apiRequestWithMeta<Assignment>('/assignments', { query: { ...params } }),
  get: (id: string) => api.get<Assignment>(`/assignments/${id}`),
  create: (payload: Record<string, unknown>) => api.post<Assignment>('/assignments', payload),
  publish: (id: string) => api.post<Assignment>(`/assignments/${id}/publish`),
  submit: (id: string, payload: Record<string, unknown>) =>
    api.post<Submission>(`/assignments/${id}/submissions`, payload),
  listSubmissions: (id: string) => api.get<Submission[]>(`/assignments/${id}/submissions`),
  gradeSubmission: (assignmentId: string, submissionId: string, payload: { score: number; feedback?: string }) =>
    api.patch<Submission>(`/assignments/${assignmentId}/submissions/${submissionId}/grade`, payload),
};
