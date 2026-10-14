import { api, apiRequestWithMeta } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/api/types';
import type { School } from '@/lib/api/domain';

export const schoolsApi = {
  list: () => api.get<School[]>('/schools', { query: { pageSize: 100 } }),
  listWithMeta: (): Promise<{ data: School[]; meta: PaginationMeta }> =>
    apiRequestWithMeta<School>('/schools', { query: { pageSize: 100 } }),
  create: (payload: Record<string, unknown>) => api.post<School>('/schools', payload),
};
