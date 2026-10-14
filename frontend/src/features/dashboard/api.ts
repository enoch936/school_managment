import { api } from '@/lib/api/client';
import type { DashboardOverview, TrendPoint } from '@/lib/api/domain';

export const dashboardApi = {
  overview: () => api.get<DashboardOverview>('/dashboard/overview'),
  enrollmentTrend: (months = 6) =>
    api.get<TrendPoint[]>('/dashboard/enrollment-trend', { query: { months } }),
};
