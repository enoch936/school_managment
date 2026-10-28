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

// --- New Domain Modules ---

export interface Guardian {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  address: string | null;
  occupation: string | null;
  students?: {
    student: {
      id: string;
      studentNumber: string;
      firstName: string;
      lastName: string;
    };
  }[];
}

export interface Exam {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  academicYearId: string;
  title: string;
  type: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ONGOING' | 'CLOSED' | 'GRADED' | 'ARCHIVED';
  totalMarks: number;
  passMark: number;
  startsAt: string | null;
  endsAt: string | null;
  class?: { id: string; name: string };
  subject?: { id: string; code: string; name: string };
  _count?: { attempts: number };
}

export interface Invoice {
  id: string;
  schoolId: string;
  invoiceNumber: string;
  issuedAt: string | null;
  dueDate: string | null;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  paidMinor: number;
  balanceMinor: number;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID' | 'REFUNDED';
  currency: string;
  student?: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
}

export interface FinanceSummary {
  currency: string;
  totalInvoicedMinor: number;
  totalCollectedMinor: number;
  totalOutstandingMinor: number;
  collectionRate: number;
  totalInvoicesCount: number;
  overdueCount: number;
}

export interface Book {
  id: string;
  schoolId: string;
  title: string;
  author: string | null;
  isbn: string | null;
  category: string | null;
  publisher: string | null;
  publishedYear: number | null;
  copies?: { id: string; barcode: string; status: string }[];
  _count?: { copies: number };
}

export interface Loan {
  id: string;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST';
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  fineMinor: number;
  bookCopy?: {
    barcode?: string;
    book?: { title: string; author: string | null };
  };
  student?: {
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
}

export interface Vehicle {
  id: string;
  schoolId: string;
  plateNumber: string;
  model: string | null;
  capacity: number;
  driverName: string | null;
  driverPhone: string | null;
  isActive: boolean;
  _count?: { routes: number };
}

export interface Route {
  id: string;
  schoolId: string;
  name: string;
  feeMinor: number;
  vehicle?: Vehicle | null;
  stops?: { id: string; name: string; sequence: number; scheduledAt: string | null }[];
  _count?: { assignments: number };
}

export interface EnrollmentReport {
  totalStudents: number;
  byGender: Record<string, number>;
  byStatus: Record<string, number>;
  byClass: Record<string, number>;
}

export interface AttendanceReport {
  totalRecords: number;
  attendanceRate: number;
  breakdown: Record<string, number>;
}

export interface FinanceReport {
  currency: string;
  totalInvoicedMinor: number;
  totalCollectedMinor: number;
  totalOutstandingMinor: number;
  collectionEfficiency: number;
  statusCounts: Record<string, number>;
}


export interface StaffMember {
  id: string;
  schoolId: string;
  campusId?: string | null;
  employeeCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
  hireDate?: string | null;
  school?: { id: string; name: string };
}

export interface Teacher {
  id: string;
  schoolId: string;
  employeeCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  qualification?: string | null;
  status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
  school?: { id: string; name: string };
  department?: { id: string; name: string } | null;
  assignments?: {
    id: string;
    subject?: { id: string; name: string; code: string };
  }[];
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  sectionId?: string | null;
  academicYearId: string;
  subject?: { id: string; name: string; code: string };
  teacher?: { id: string; firstName: string; lastName: string };
}

export interface TimetableEntry {
  id: string;
  schoolId: string;
  academicYearId: string;
  termId?: string | null;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  teacherId?: string | null;
  roomId?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  class?: { id: string; name: string };
  section?: { id: string; name: string } | null;
  subject?: { id: string; name: string; code: string };
  teacher?: { id: string; firstName: string; lastName: string } | null;
  room?: { id: string; name: string } | null;
}

export interface Assignment {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  teacherId?: string | null;
  title: string;
  description?: string | null;
  maxScore: number;
  dueAt: string;
  publishedAt?: string | null;
  allowLate: boolean;
  class?: { id: string; name: string };
  subject?: { id: string; name: string; code: string };
  _count?: { submissions: number };
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  content?: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'RETURNED';
  submittedAt?: string | null;
  score?: number | null;
  feedback?: string | null;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    studentNumber: string;
  };
}

export interface DisciplineCase {
  id: string;
  schoolId: string;
  studentId: string;
  incidentDate: string;
  category: string;
  description: string;
  actionTaken?: string | null;
  status: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    studentNumber: string;
  };
}

export interface HealthRecord {
  id: string;
  schoolId: string;
  studentId: string;
  bloodType?: string | null;
  allergies?: string | null;
  conditions?: string | null;
  medications?: string | null;
  notes?: string | null;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    studentNumber: string;
  };
}
