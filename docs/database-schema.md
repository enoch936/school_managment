# Database Schema & Relational Integrity

## 1. Overview & Core Philosophy

The School Management System (SMS) database is architected on PostgreSQL 18 using Prisma ORM. It models a multi-tenant, multi-campus, academic-year-aware enterprise educational hierarchy.

```mermaid
erDiagram
    Organization ||--o{ School : owns
    Organization ||--o{ Membership : scopes
    School ||--o{ Campus : contains
    School ||--o{ AcademicYear : conducts
    School ||--o{ Student : registers
    School ||--o{ Teacher : employs
    School ||--o{ Invoice : bills
    AcademicYear ||--o{ Term : divides
    AcademicYear ||--o{ Class : schedules
    Class ||--o{ Enrollment : contains
    Student ||--o{ Enrollment : joins
    Student ||--o{ AttendanceRecord : attends
    Student ||--o{ Invoice : receives
    Invoice ||--o{ PaymentAllocation : settles
    Payment ||--o{ PaymentAllocation : funds
```

---

## 2. Key Design Standards

### 2.1 Identifier & Primary Key Strategy
- **Text-based UUID primary keys**: `id String @id @default(uuid())` across all entities to prevent ID enumeration vulnerabilities (BOLA/IDOR).
- Foreign keys consistently reference string UUIDs with cascade or set-null constraints where appropriate.

### 2.2 Multi-Tenant Organization Scoping
- Top-level tenant context is established by `Organization`.
- Every tenant-scoped query resolves `organizationId` from the authenticated principal token—never trusted from client input.
- Schools and campus entities enforce strict organizational ownership:
  ```prisma
  @@unique([organizationId, code])
  @@index([organizationId])
  ```

### 2.3 Financial Precision & Minor Units
- All financial balances, invoices, unit prices, and payments are strictly modeled as **integer minor units** (e.g., 50000 = 500.00 ETB) to eliminate binary floating-point rounding errors.
- Entities: `subtotalMinor`, `discountMinor`, `taxMinor`, `totalMinor`, `paidMinor`, `balanceMinor`, `amountMinor`.
- Multi-currency support: Default currency is Ethiopian Birr (`ETB`) with configurable per-school ISO-4217 currencies.

### 2.4 Timezone-Aware Timestamps
- All temporal fields use PostgreSQL `TIMESTAMPTZ(6)`: `createdAt`, `updatedAt`, `startsAt`, `endsAt`, `paidAt`, `dueAt`.

---

## 3. Entity Catalog

| Entity | Primary Responsibility | Key Constraints & Indices |
| :--- | :--- | :--- |
| `Organization` | Highest tenancy root | `@@index([slug])`, `@@index([isActive])` |
| `School` | Institutional legal entity | `@@unique([organizationId, code])` |
| `Campus` | Physical school location/branch | `@@unique([schoolId, code])` |
| `User` | Global identity / credentials | `@@unique([email])` |
| `Membership` | User role per Org/School/Campus | `@@unique([userId, organizationId, schoolId, campusId, roleId])` |
| `AcademicYear` | Yearly calendar boundary | `@@unique([schoolId, name])` |
| `Class` | Class group with capacity | `@@unique([academicYearId, name])` |
| `Student` | Student record with SIS metadata | `@@unique([schoolId, studentNumber])` |
| `Guardian` | Parent/guardian contact info | `@@index([schoolId])` |
| `StudentGuardian`| M:N child-guardian links | `@@unique([studentId, guardianId])` |
| `AttendanceRecord`| Daily / per-period attendance marks | `@@unique([studentId, date, period])`, `@@index([schoolId, date])` |
| `Exam` | Standardized test / exam definition | `@@index([schoolId, status])` |
| `ExamAttempt` | Student exam result / percentage | `@@unique([examId, studentId])` |
| `Invoice` | Billable school fees & installments | `@@unique([schoolId, invoiceNumber])`, `@@index([studentId])` |
| `Payment` | Receipted financial collection | `@@unique([schoolId, receiptNumber])`, `@@unique([idempotencyKey])` |
| `Book` / `BookCopy` | Library textbook catalog & barcodes | `@@index([schoolId])`, `@@unique([barcode])` |
| `Loan` | Book borrowing & return lifecycle | `@@index([studentId, status])` |
| `Vehicle` / `Route`| School bus fleet & transit lines | `@@unique([schoolId, plateNumber])` |
| `AuditEvent` | Immutable security log entries | `@@index([organizationId, createdAt])` |
