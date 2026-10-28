# REST API Reference & Contract

The SMS REST API is versioned at `/api/v1` and documented through OpenAPI / Swagger at `/api/docs`.

---

## 1. Architectural Standards

- **Base URI**: `http://localhost:4000/api/v1` (Proxied in production via Nginx at `/api/v1`).
- **Authentication**: JWT Bearer token via `Authorization: Bearer <access_token>` or HttpOnly cookie.
- **Tenant Context**: Resolved from authenticated JWT claims (`organizationId`, `activeSchoolId`).
- **Standard Envelopes**:
  - Success responses return `{ success: true, data: T, meta?: PaginationMeta }`.
  - Errors return RFC-7807 compatible JSON with `{ statusCode, code, message, timestamp, path }`.

---

## 2. API Endpoint Matrix

### 2.1 Authentication & Identity (`/auth`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Email/password login with argon2id verification | Public |
| `POST` | `/auth/refresh` | Rotating refresh token exchange | Public |
| `POST` | `/auth/logout` | Revokes current refresh token & session | JWT Auth |
| `GET` | `/auth/me` | Retrieves active user principal and permissions | JWT Auth |
| `POST` | `/auth/mfa/setup` | Generates TOTP secret and QR payload | JWT Auth |
| `POST` | `/auth/mfa/verify`| Verifies TOTP token and activates MFA | JWT Auth |

### 2.2 Organizations & Schools (`/organizations`, `/schools`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/schools` | Lists schools within caller's organization | `school:read` |
| `POST` | `/schools` | Registers a new school entity | `school:manage` |
| `GET` | `/schools/:id/campuses`| Lists branches/campuses for a school | `campus:read` |

### 2.3 Students & Academics (`/students`, `/academics`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/students` | Paginated search of students with filters | `student:read` |
| `POST` | `/students` | Enrolls a new student with unique student # | `student:manage` |
| `GET` | `/academic-years` | Lists school academic sessions | `academic-year:read`|
| `GET` | `/classes` | Lists grade levels, sections, capacities | `class:read` |
| `GET` | `/subjects` | Lists subjects and core curriculum | `subject:read` |

### 2.4 Attendance (`/attendance`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/attendance` | Queries attendance logs with date range | `attendance:read` |
| `POST` | `/attendance` | Records bulk daily or per-period status | `attendance:record`|

### 2.5 Guardians (`/guardians`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/guardians` | Search parent/guardian directory | `guardian:read` |
| `POST` | `/guardians` | Creates guardian profile | `guardian:manage` |
| `POST` | `/guardians/:id/students` | Links child to guardian with relation | `guardian:manage` |

### 2.6 Examinations & Grading (`/examinations`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/examinations` | Lists scheduled and graded exams | `exam:read` |
| `POST` | `/examinations` | Schedules new exam with weight & passmark | `exam:manage` |
| `POST` | `/examinations/:id/publish` | Publishes exam results to students/parents | `grade:publish` |
| `POST` | `/examinations/:id/grades` | Records student score & auto-percentage | `grade:manage` |
| `GET` | `/examinations/:id/results`| Generates summary analytics & pass rate | `grade:read` |

### 2.7 Finance & Billing (`/finance`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/finance/summary` | Institutional KPIs (Gross Invoiced, Collected, Net) | `invoice:read` |
| `GET` | `/finance/invoices` | Paginated invoice query with status filter | `invoice:read` |
| `POST` | `/finance/invoices` | Issues multi-item fee invoice in minor units | `invoice:manage` |
| `POST` | `/finance/payments` | Records payment & settles balance via transaction | `payment:manage` |

### 2.8 Library & Transport (`/library`, `/transport`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/library/books` | Queries book inventory and copies | `library:read` |
| `POST` | `/library/books` | Catalogs book and barcodes | `library:manage` |
| `POST` | `/library/loans` | Issues loan checkout to student | `library:manage` |
| `POST` | `/library/loans/:id/return`| Returns book copy and calculates fines | `library:manage` |
| `GET` | `/transport/routes` | Lists active bus routes and capacity | `transport:read` |
| `POST` | `/transport/assignments` | Assigns student to bus route | `transport:manage` |

### 2.9 Reports & Monitoring (`/reports`, `/monitoring/health`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/reports/enrollment` | Demographic and status breakdown | `report:read` |
| `GET` | `/reports/attendance` | Attendance rate and status breakdown | `report:read` |
| `GET` | `/reports/finance` | Revenue collection efficiency report | `report:read` |
| `GET` | `/reports/export/:type` | Downloads RFC 4180 streaming CSV export | `report:export` |
| `GET` | `/monitoring/health` | Liveness and readiness health checks | Public |
