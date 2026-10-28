# User Roles & Permission Catalog

The School Management System features a fine-grained Role-Based Access Control (RBAC) model with 25 system roles and over 60 granular permissions.

---

## 1. System Roles Matrix

| # | Role Key | Role Name | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| 1 | `PLATFORM_SUPER_ADMIN` | Platform Super Administrator | Full cross-organization root management |
| 2 | `SCHOOL_OWNER` | School Owner | Full institutional authority and licensing |
| 3 | `SCHOOL_ADMIN` | School Administrator | Academic and administrative control |
| 4 | `CAMPUS_ADMIN` | Campus Administrator | Branch/campus level operations |
| 5 | `PRINCIPAL` | Principal / Head Teacher | Academic oversight, discipline, staff reviews |
| 6 | `VICE_PRINCIPAL` | Vice Principal | Curriculum, timetables, discipline |
| 7 | `REGISTRAR` | Registrar | Student admissions, enrollments, records |
| 8 | `ADMISSIONS_OFFICER` | Admissions Officer | Prospective applicant funnel & processing |
| 9 | `ACADEMIC_COORDINATOR`| Academic Coordinator | Timetables, exam schedules, course allocations |
| 10 | `DEPARTMENT_HEAD` | Department Head | Subject curricula and teacher supervision |
| 11 | `TEACHER` | Teacher | Classroom attendance, assignments, grading |
| 12 | `ASSISTANT_TEACHER` | Assistant Teacher | Attendance recording and grading support |
| 13 | `STUDENT` | Student | Course material, assignments, grade viewing |
| 14 | `PARENT` | Parent / Guardian | Attendance, grades, tuition fees and payments |
| 15 | `ACCOUNTANT` | Accountant | Invoicing, fee structures, refunds, reconciliation |
| 16 | `CASHIER` | Cashier | Direct payment recording & receipt issuance |
| 17 | `HR_MANAGER` | HR Manager | Staff profiles, leaves, employment contracts |
| 18 | `PAYROLL_OFFICER` | Payroll Officer | Salary structures, payslips, deductions |
| 19 | `LIBRARIAN` | Librarian | Book cataloging, checkouts, returns, fines |
| 20 | `TRANSPORT_MANAGER` | Transport Manager | Bus fleet, routes, stops, student allocations |
| 21 | `NURSE` | School Nurse | Health records, emergency care plans |
| 22 | `COUNSELOR` | Counselor | Confidential counseling sessions & notes |
| 23 | `EXAM_OFFICER` | Examination Officer | Exam scheduling, mark entry, result publishing |
| 24 | `IT_SUPPORT` | IT Support | User access, credential resets, audit inspection |
| 25 | `AUDITOR` | Auditor | Read-only inspection of logs, transactions |

---

## 2. Granular Permission Catalog

Permissions adhere to standard `resource:action` taxonomy:
- **Tenancy & Schools**: `platform:manage`, `school:read`, `school:manage`, `campus:read`, `campus:manage`
- **Users & Roles**: `user:read`, `user:manage`, `role:read`, `role:manage`
- **Academics**: `academic-year:read`, `academic-year:manage`, `class:read`, `class:manage`, `subject:read`, `subject:manage`, `timetable:read`, `timetable:manage`
- **Students & Guardians**: `student:read`, `student:manage`, `guardian:read`, `guardian:manage`
- **Attendance**: `attendance:read`, `attendance:record`, `attendance:approve`
- **Examinations & Grading**: `exam:read`, `exam:manage`, `grade:read`, `grade:manage`, `grade:publish`
- **Assignments**: `assignment:read`, `assignment:manage`
- **Finance**: `fee:read`, `fee:manage`, `invoice:read`, `invoice:manage`, `payment:read`, `payment:manage`
- **Library**: `library:read`, `library:manage`
- **Transport**: `transport:read`, `transport:manage`
- **Reports**: `report:read`, `report:export`
- **Audit & Security**: `audit:read`
