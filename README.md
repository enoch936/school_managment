# Enterprise School Management System (SMS)

A modern, production-grade, multi-tenant School Management System engineered with Next.js (App Router), NestJS, PostgreSQL (Prisma ORM), Redis, and role-based tenant isolation.

---

## 1. Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Radix UI primitives, Lucide icons, TanStack Query, Zustand, Recharts.
- **Backend**: NestJS 11, TypeScript, Prisma ORM 6, PostgreSQL 18, Redis 7 (persistent AOF), BullMQ, Passport JWT, Argon2id password hashing, TOTP MFA, Pino structured logging, Helmet.
- **Storage**: Storage abstraction with local filesystem and S3 adapters, HMAC expiring signed URLs for confidential student records.
- **Infrastructure & CI**: Docker Compose, Nginx reverse proxy with SSL termination and rate limiting, GitHub Actions CI, k6 performance load testing.

---

## 2. Architecture & Monorepo Structure

```
school-management/
├── frontend/               # Next.js 15 App Router web application
├── backend/                # NestJS modular REST API with versioned /api/v1 namespace
├── infrastructure/         # Nginx reverse proxy configuration & production orchestration
│   └── nginx/
│       └── nginx.conf
├── scripts/                # Operational runbooks, database backups, load tests
│   ├── backup-db.sh
│   ├── dev-setup.sh
│   └── load-test.k6.js
├── docs/                   # Complete enterprise documentation suite
│   ├── architecture.md
│   ├── database-schema.md
│   ├── api.md
│   ├── tenant-isolation.md
│   ├── security.md
│   ├── threat-model.md
│   ├── testing.md
│   ├── deployment.md
│   ├── backup-and-recovery.md
│   ├── performance-and-scaling.md
│   ├── operations-runbook.md
│   ├── user-roles-and-permissions.md
│   ├── feature-matrix.md
│   ├── implementation-status.md
│   └── decisions/          # Architecture Decision Records (ADRs)
├── docker-compose.yml      # Local development (PostgreSQL + Redis + MailHog)
├── docker-compose.prod.yml # Production multi-container deployment
├── package.json            # Root workspace scripts
└── pnpm-workspace.yaml
```

---

## 3. Getting Started

### Prerequisites
- Node.js >= 20.11
- pnpm >= 9.0
- Docker & Docker Compose

### Quick Setup
```bash
# 1. Install dependencies across workspaces
pnpm install

# 2. Configure environment variables
cp .env.example .env

# 3. Start local database & cache
docker compose up -d

# 4. Generate Prisma client & apply database migrations
pnpm --filter @sms/backend prisma:generate
pnpm --filter @sms/backend prisma:migrate
pnpm --filter @sms/backend prisma:seed

# 5. Start development servers in parallel
pnpm dev
```

- **Web Portal**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000/api/v1`
- **Interactive OpenAPI/Swagger**: `http://localhost:4000/api/docs`
- **Health Probes**: `http://localhost:4000/api/v1/monitoring/health`

---

## 4. Key Operational Commands

| Command | Purpose |
| :--- | :--- |
| `pnpm dev` | Run backend & frontend in parallel watch mode |
| `pnpm build` | Compile production builds for both backend and frontend |
| `pnpm typecheck` | Strict TypeScript validation across all workspaces |
| `pnpm lint` | Run ESLint checks across backend and frontend |
| `pnpm test` | Run all backend (Jest) and frontend (Vitest) tests |
| `pnpm db:migrate` | Apply Prisma database schema migrations |
| `pnpm db:seed` | Seed default system roles (25 roles), permissions, and demo data |
| `k6 run scripts/load-test.k6.js` | Execute 100,000-user capacity load test |

---

## 5. Enterprise Documentation Index

- [Architecture & Overview](file:///c:/school_managment/docs/architecture.md)
- [Database Schema & ER Model](file:///c:/school_managment/docs/database-schema.md)
- [REST API Reference](file:///c:/school_managment/docs/api.md)
- [Multi-Tenant Isolation](file:///c:/school_managment/docs/tenant-isolation.md)
- [Security & ASVS Compliance](file:///c:/school_managment/docs/security.md)
- [Threat Model (STRIDE)](file:///c:/school_managment/docs/threat-model.md)
- [Testing Strategy](file:///c:/school_managment/docs/testing.md)
- [Deployment Guide](file:///c:/school_managment/docs/deployment.md)
- [Backup & Disaster Recovery](file:///c:/school_managment/docs/backup-and-recovery.md)
- [100,000 Users Scale & Concurrency](file:///c:/school_managment/docs/performance-and-scaling.md)
- [Operations SRE Runbook](file:///c:/school_managment/docs/operations-runbook.md)
- [User Roles & Permissions (25 Roles)](file:///c:/school_managment/docs/user-roles-and-permissions.md)
- [Feature Matrix (Modules A - T)](file:///c:/school_managment/docs/feature-matrix.md)
- [Implementation Status](file:///c:/school_managment/docs/implementation-status.md)
- [Architecture Decision Records](file:///c:/school_managment/docs/decisions/)
