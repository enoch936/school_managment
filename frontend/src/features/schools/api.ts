import { api } from '@/lib/api/client';

export interface Campus {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  capacity?: number | null;
  isActive: boolean;
  _count?: {
    students: number;
    staff: number;
    rooms: number;
    classes: number;
  };
}

export interface AcademicCalendarEvent {
  id: string;
  schoolId: string;
  academicYearId?: string | null;
  title: string;
  description?: string | null;
  type: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  affectsAttendance: boolean;
}

export interface GradeBand {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gpaValue?: number;
  description?: string;
}

export interface GradingScale {
  id: string;
  schoolId: string;
  name: string;
  type: string;
  isDefault: boolean;
  bands: GradeBand[];
}

export interface SchoolPolicy {
  id: string;
  schoolId: string;
  category: string;
  key: string;
  name: string;
  value: Record<string, unknown>;
  description?: string | null;
  updatedAt: string;
}

export interface DocumentTemplate {
  id: string;
  schoolId: string;
  type: string;
  name: string;
  layout: Record<string, unknown>;
  headerLogo?: string | null;
  footerText?: string | null;
  isActive: boolean;
}

export interface SchoolDetails {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  type?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  taxId?: string | null;
  logoUrl?: string | null;
  timezone: string;
  locale: string;
  currency: string;
  isActive: boolean;
  campuses: Campus[];
  academicYears: Array<{ id: string; name: string; isCurrent: boolean }>;
  gradingScales: GradingScale[];
  policies: SchoolPolicy[];
  documentTemplates: DocumentTemplate[];
  _count?: {
    students: number;
    staff: number;
    classes: number;
  };
}

export interface TenantSubscriptionInfo {
  subscription: {
    id: string;
    plan: string;
    status: string;
    seatsAllowed: number;
    studentLimit: number;
    campusLimit: number;
    staffLimit: number;
    storageLimitMb: number;
    startsAt: string;
    endsAt?: string | null;
  };
  usage: {
    students: { current: number; limit: number; utilizationPercent: number };
    staff: { current: number; limit: number; utilizationPercent: number };
    campuses: { current: number; limit: number; utilizationPercent: number };
    schools: { current: number };
  };
}

export interface FeatureFlagItem {
  key: string;
  enabled: boolean;
  description: string;
  metadata: Record<string, unknown>;
  isCustomized: boolean;
}

export interface SchoolOnboardingInput {
  name: string;
  code: string;
  type?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  taxId?: string;
  logoUrl?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
  mainCampusName: string;
  mainCampusCode: string;
  mainCampusAddress?: string;
  academicYearName: string;
  academicYearStartDate: string;
  academicYearEndDate: string;
  termNames: string[];
  gradingScaleType?: string;
  attendanceMode?: string;
  minAttendancePercentage?: number;
}

// --- API Methods ---

export async function onboardSchool(input: SchoolOnboardingInput) {
  return api.post<{ school: SchoolDetails; campus: Campus }>('/schools/onboard', input);
}

export async function listSchools() {
  return api.get<SchoolDetails[]>('/schools');
}

export async function getSchool(id: string) {
  return api.get<SchoolDetails>(`/schools/${id}`);
}

export async function updateSchool(id: string, data: Partial<SchoolDetails>) {
  return api.patch<SchoolDetails>(`/schools/${id}`, data);
}

export async function listCampuses(schoolId: string) {
  return api.get<Campus[]>(`/schools/${schoolId}/campuses`);
}

export async function createCampus(data: { schoolId: string; name: string; code: string; address?: string; phone?: string; capacity?: number }) {
  return api.post<Campus>('/campuses', data);
}

export async function updateCampus(id: string, data: Partial<Campus>) {
  return api.patch<Campus>(`/campuses/${id}`, data);
}

export async function deleteCampus(id: string) {
  return api.delete<{ id: string; deleted: boolean }>(`/campuses/${id}`);
}

export async function listCalendarEvents(schoolId: string) {
  return api.get<AcademicCalendarEvent[]>(`/schools/${schoolId}/calendar-events`);
}

export async function createCalendarEvent(schoolId: string, data: Omit<AcademicCalendarEvent, 'id' | 'schoolId'>) {
  return api.post<AcademicCalendarEvent>(`/schools/${schoolId}/calendar-events`, { ...data, schoolId });
}

export async function deleteCalendarEvent(id: string) {
  return api.delete<{ id: string; deleted: boolean }>(`/calendar-events/${id}`);
}

export async function listGradingScales(schoolId: string) {
  return api.get<GradingScale[]>(`/schools/${schoolId}/grading-scales`);
}

export async function createGradingScale(schoolId: string, data: Omit<GradingScale, 'id' | 'schoolId'>) {
  return api.post<GradingScale>(`/schools/${schoolId}/grading-scales`, { ...data, schoolId });
}

export async function listSchoolPolicies(schoolId: string, category?: string) {
  return api.get<SchoolPolicy[]>(`/schools/${schoolId}/policies`, { query: category ? { category } : undefined });
}

export async function upsertSchoolPolicy(schoolId: string, data: { category: string; key: string; name: string; value: Record<string, unknown>; description?: string }) {
  return api.put<SchoolPolicy>(`/schools/${schoolId}/policies`, { ...data, schoolId });
}

export async function listDocumentTemplates(schoolId: string) {
  return api.get<DocumentTemplate[]>(`/schools/${schoolId}/document-templates`);
}

export async function createDocumentTemplate(schoolId: string, data: Omit<DocumentTemplate, 'id' | 'schoolId'>) {
  return api.post<DocumentTemplate>(`/schools/${schoolId}/document-templates`, { ...data, schoolId });
}

export async function getTenantSubscription() {
  return api.get<TenantSubscriptionInfo>('/organization/subscription');
}

export async function listFeatureFlags() {
  return api.get<FeatureFlagItem[]>('/organization/feature-flags');
}

export async function toggleFeatureFlag(key: string, enabled: boolean) {
  return api.post<FeatureFlagItem>('/organization/feature-flags', { key, enabled });
}

export const schoolsApi = {
  list: listSchools,
  listWithMeta: async () => {
    const res = await listSchools();
    return { data: res, meta: { total: res?.length ?? 0 } };
  },
  get: getSchool,
  create: (data: Parameters<typeof api.post>[1]) => api.post('/schools', data),
  update: updateSchool,
};

