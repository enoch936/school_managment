import { api } from '@/lib/api/client';
import type { TimetableEntry } from '@/lib/api/domain';

export interface TimetableQuery {
  schoolId?: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  teacherId?: string;
  dayOfWeek?: number;
}

export const timetablesApi = {
  list: (params: TimetableQuery): Promise<TimetableEntry[]> =>
    api.get<TimetableEntry[]>('/timetables', { query: { ...params } }),
  create: (payload: Record<string, unknown>) =>
    api.post<TimetableEntry>('/timetables', payload),
  delete: (id: string) =>
    api.delete<{ success: boolean; id: string }>(`/timetables/${id}`),
};
