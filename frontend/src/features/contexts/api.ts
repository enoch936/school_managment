import { api } from '@/lib/api/client';

export interface AvailableCampus {
  id: string;
  name: string;
  code: string;
}

export interface AvailableAcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'UPCOMING' | 'CLOSED';
}

export interface AvailableSchool {
  id: string;
  name: string;
  code: string;
  campuses: AvailableCampus[];
  academicYears: AvailableAcademicYear[];
}

export interface AvailableOrganization {
  id: string;
  name: string;
  slug: string;
  roleKey: string | null;
  schools: AvailableSchool[];
}

export interface AvailableContextsResponse {
  organizations: AvailableOrganization[];
  active: {
    organizationId: string | null;
    schoolId: string | null;
    campusId: string | null;
    academicYearId: string | null;
    academicYearStatus: 'ACTIVE' | 'UPCOMING' | 'CLOSED' | 'ARCHIVED' | null;
    roleKey: string | null;
  };
}

export async function fetchAvailableContexts(): Promise<AvailableContextsResponse> {
  return api.get<AvailableContextsResponse>('/contexts/available');
}

export async function fetchActiveContext(): Promise<AvailableContextsResponse['active'] & { permissions: string[] }> {
  return api.get('/contexts/active');
}
