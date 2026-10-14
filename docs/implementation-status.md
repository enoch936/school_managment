# Implementation status

This file is the honest, current state of the project. It is updated as work
progresses and distinguishes what is implemented, what is partial, and what is
not yet implemented.

## Verification performed

Run on Windows (Node v24.19, pnpm 11.21) with a **local PostgreSQL 18** and
without Redis/Docker:

| Check | Backend | Frontend |
| --- | --- | --- |
| Typecheck | PASS | PASS |
| Lint | PASS | PASS |
| Unit tests | PASS (3) | PASS (5) |
| Build | PASS | PASS (13 routes) |
| E2E | PASS (1, DB stubbed) | Playwright configured, not run |

Database-dependent steps (run against local PostgreSQL 18, database `sms`):

| Step | Result |
| --- | --- |
| `prisma migrate dev --name init` | PASS — migration `20261014203107_init` applied |
| `prisma generate` | PASS |
| `prisma:seed` | PASS — permissions, 25 roles, platform super admin, demo org data |
| Live smoke test | PASS — backend `/v1/health` = ok; `POST /api/v1/auth/login` = 200 |
| Dev servers | Backend `:4000`, frontend `:3000` both start and serve |

> Redis is not running, so `CacheService` uses its in-memory fallback (single
> instance only); BullMQ queues and the socket Redis adapter are not exercised.
> `docker-compose.yml` still provisions Postgres/Redis/Mailhog for isolated runs.

## Implemented

- **Multi-tenancy**: Organization → School → Campus hierarchy; tenant scoping by
  `organizationId` derived from the server-side principal, never from client input.
- **Auth**: email/password (argon2id), JWT access tokens (15m) + rotating
  refresh tokens with reuse detection, httpOnly cookies, TOTP MFA + recovery
  codes, password reset / email verification tokens (cache-backed).
- **RBAC**: permission catalog (`resource:action`), 25 system roles, role/
  permission resolution with short-TTL caching and invalidation.
- **Audit**: `@Audit()` interceptor recording security-relevant events; query API.
- **Modules (API + UI)**: Dashboard, Students, Schools/Campuses, Academics
  (years/terms/classes/subjects), Attendance, Audit log, Settings (profile,
  password, MFA).
- **Infrastructure**: Redis cache with in-memory fallback, email service (dev
  logging), health (liveness/readiness), Swagger, throttling, structured logging.

## Partial

- **Notifications**: WebSocket gateway + service/controller exist server-side;
  the frontend does not yet consume the socket (no `socket.io-client` provider).
- **Frontend**: other domain areas (guardians, exams, finance, library,
  transport, reports) are shown in the sidebar as **"Soon"** and disabled — they
  have schema/models but no API endpoints or pages yet.

## Not implemented

- Exams/grading, finance/invoicing/payments, library, transport, inventory,
  messaging, documents, discipline/health records, imports/exports endpoints.
- Background job processors (BullMQ queues are wired as dependencies only).
- File uploads (Cloudinary/S3) beyond configuration.

## Known defects / risks

- `prisma/seed.ts` uses upserts against composite uniques that include nullable
  columns; on PostgreSQL, NULLs are distinct, so rerunning the seed may create
  duplicates instead of updating. It completed successfully on first run, but a
  deterministic natural key should be added before it is treated as idempotent.
- Frontend `sidebar` planned items are intentionally non-navigable.
- `CacheService` falls back to in-memory when Redis is absent; fine for a single
  process but not for horizontally scaled deployments.

## Deviations from the original design

- **UUID → text columns**: `schema.prisma` originally mixed `uuid` primary keys
  (`@db.Uuid`) with `text` foreign-key columns, which made the initial migration
  fail (`P3018`, `Subscription_organizationId_fkey ... incompatible types: text
  and uuid`). All `@db.Uuid` attributes were removed so ids are plain `text`.
  Prisma still defaults ids to `uuid()` values, so behaviour is equivalent; the
  column type is `text` instead of the native `uuid` type.
- **API version prefix**: `API_VERSION` is `1`, not `v1`. Nest's URI versioning
  prepends `v`, so `v1` produced `/api/vv1/...`. The effective base path is
  `/api/v1`, matching the frontend client and `next.config.ts` rewrite.
