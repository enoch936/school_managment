/**
 * Central permission catalog. Permissions use the `resource:action` format and
 * are the single source of truth for authorization checks. Roles receive sets
 * of these keys (see prisma/seed.ts).
 */
export const PERMISSIONS = {
  // Platform / tenancy
  PLATFORM_MANAGE: 'platform:manage',
  ORGANIZATION_READ: 'organization:read',
  ORGANIZATION_MANAGE: 'organization:manage',
  SCHOOL_READ: 'school:read',
  SCHOOL_MANAGE: 'school:manage',
  CAMPUS_READ: 'campus:read',
  CAMPUS_MANAGE: 'campus:manage',

  // Users, roles, access
  USER_READ: 'user:read',
  USER_MANAGE: 'user:manage',
  ROLE_READ: 'role:read',
  ROLE_MANAGE: 'role:manage',

  // Academic structure
  ACADEMIC_YEAR_READ: 'academic-year:read',
  ACADEMIC_YEAR_MANAGE: 'academic-year:manage',
  CLASS_READ: 'class:read',
  CLASS_MANAGE: 'class:manage',
  SUBJECT_READ: 'subject:read',
  SUBJECT_MANAGE: 'subject:manage',
  TIMETABLE_READ: 'timetable:read',
  TIMETABLE_MANAGE: 'timetable:manage',

  // People
  STUDENT_READ: 'student:read',
  STUDENT_MANAGE: 'student:manage',
  GUARDIAN_READ: 'guardian:read',
  GUARDIAN_MANAGE: 'guardian:manage',
  TEACHER_READ: 'teacher:read',
  TEACHER_MANAGE: 'teacher:manage',
  STAFF_READ: 'staff:read',
  STAFF_MANAGE: 'staff:manage',

  // Operations
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_RECORD: 'attendance:record',
  ATTENDANCE_APPROVE: 'attendance:approve',
  ASSIGNMENT_READ: 'assignment:read',
  ASSIGNMENT_MANAGE: 'assignment:manage',
  EXAM_READ: 'exam:read',
  EXAM_MANAGE: 'exam:manage',
  GRADE_READ: 'grade:read',
  GRADE_MANAGE: 'grade:manage',
  GRADE_PUBLISH: 'grade:publish',

  // Finance
  FEE_READ: 'fee:read',
  FEE_MANAGE: 'fee:manage',
  INVOICE_READ: 'invoice:read',
  INVOICE_MANAGE: 'invoice:manage',
  PAYMENT_READ: 'payment:read',
  PAYMENT_MANAGE: 'payment:manage',

  // Library / transport / inventory
  LIBRARY_READ: 'library:read',
  LIBRARY_MANAGE: 'library:manage',
  TRANSPORT_READ: 'transport:read',
  TRANSPORT_MANAGE: 'transport:manage',
  INVENTORY_READ: 'inventory:read',
  INVENTORY_MANAGE: 'inventory:manage',

  // Communication
  ANNOUNCEMENT_READ: 'announcement:read',
  ANNOUNCEMENT_MANAGE: 'announcement:manage',
  MESSAGE_SEND: 'message:send',

  // Sensitive
  DISCIPLINE_READ: 'discipline:read',
  DISCIPLINE_MANAGE: 'discipline:manage',
  HEALTH_READ: 'health:read',
  HEALTH_MANAGE: 'health:manage',

  // Reporting / audit / ops
  REPORT_READ: 'report:read',
  REPORT_EXPORT: 'report:export',
  AUDIT_READ: 'audit:read',
  DOCUMENT_READ: 'document:read',
  DOCUMENT_MANAGE: 'document:manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS);
