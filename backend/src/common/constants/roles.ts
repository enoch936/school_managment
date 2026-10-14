/**
 * System role keys. The `Permission` and `Role` tables are seeded from these
 * definitions, but organizations may create additional custom roles.
 */
export const ROLE_KEYS = {
  PLATFORM_SUPER_ADMIN: 'platform_super_admin',
  SCHOOL_OWNER: 'school_owner',
  SCHOOL_ADMIN: 'school_admin',
  CAMPUS_ADMIN: 'campus_admin',
  PRINCIPAL: 'principal',
  REGISTRAR: 'registrar',
  ADMISSIONS_OFFICER: 'admissions_officer',
  ACADEMIC_COORDINATOR: 'academic_coordinator',
  DEPARTMENT_HEAD: 'department_head',
  TEACHER: 'teacher',
  ASSISTANT_TEACHER: 'assistant_teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  ACCOUNTANT: 'accountant',
  CASHIER: 'cashier',
  HR_MANAGER: 'hr_manager',
  PAYROLL_OFFICER: 'payroll_officer',
  LIBRARIAN: 'librarian',
  TRANSPORT_MANAGER: 'transport_manager',
  NURSE: 'nurse',
  COUNSELOR: 'counselor',
  EXAM_OFFICER: 'examination_officer',
  IT_SUPPORT: 'it_support',
  AUDITOR: 'auditor',
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const ROLE_NAMES: Record<string, string> = {
  platform_super_admin: 'Platform Super Administrator',
  school_owner: 'School Owner',
  school_admin: 'School Administrator',
  campus_admin: 'Campus Administrator',
  principal: 'Principal / Head Teacher',
  registrar: 'Registrar',
  admissions_officer: 'Admissions Officer',
  academic_coordinator: 'Academic Coordinator',
  department_head: 'Department Head',
  teacher: 'Teacher',
  assistant_teacher: 'Assistant Teacher',
  student: 'Student',
  parent: 'Parent / Guardian',
  accountant: 'Accountant',
  cashier: 'Cashier',
  hr_manager: 'HR Manager',
  payroll_officer: 'Payroll Officer',
  librarian: 'Librarian',
  transport_manager: 'Transport Manager',
  nurse: 'School Nurse',
  counselor: 'Counselor',
  examination_officer: 'Examination Officer',
  it_support: 'IT Support',
  auditor: 'Auditor / Read-only Reviewer',
};
