export type StudentStatus =
  | 'APPLICANT'
  | 'ACTIVE'
  | 'TRANSFERRED'
  | 'WITHDRAWN'
  | 'GRADUATED'
  | 'SUSPENDED';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNDISCLOSED';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  avatarUrl?: string | null;
  isPlatformAdmin: boolean;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
}

export interface Membership {
  membershipId: string;
  organizationId: string;
  schoolId: string | null;
  campusId: string | null;
  roleKey: string | null;
  status: string;
}

export interface Principal {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
  permissions: string[];
  memberships: Membership[];
  activeOrganizationId: string | null;
  activeSchoolId: string | null;
  activeCampusId: string | null;
}

export interface MeResponse {
  principal: Principal;
  user: AuthUser;
}

export interface Student {
  id: string;
  schoolId: string;
  campusId: string | null;
  studentNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: Gender;
  dateOfBirth: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: StudentStatus;
  enrollmentDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface School {
  id: string;
  name: string;
  code: string;
  type: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  _count?: { campuses: number; students: number };
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface ClassEntity {
  id: string;
  schoolId: string;
  campusId: string | null;
  academicYearId: string;
  name: string;
  capacity: number;
  academicYear?: { id: string; name: string };
  _count?: { enrollments: number; sections: number };
}

export interface Subject {
  id: string;
  schoolId: string;
  code: string;
  name: string;
  creditHours: number | null;
  isCore: boolean;
}

export interface DashboardOverview {
  students: { total: number; active: number };
  teachers: number;
  classes: number;
  schools: number;
  finance: { currency: string; outstandingMinor: number; collectedMinor: number };
  attendanceToday: {
    total: number;
    present: number;
    rate: number;
    byStatus: Record<string, number>;
  };
}

export interface TrendPoint {
  label: string;
  value: number;
}
