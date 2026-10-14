# Architecture

## Monorepo layout

```
frontend/   Next.js App Router web app
backend/    NestJS API
docs/       Documentation
```

## Request lifecycle (backend)

1. `CorrelationIdMiddleware` attaches a request id.
2. `ThrottlerGuard` → `JwtAuthGuard` → `PermissionsGuard` (global order).
   - `JwtAuthGuard` validates the access token, then builds a **server-authoritative
     principal** (memberships + permissions) via `AuthorizationService`. The active
     organization comes from the `x-organization-id` header, validated against the
     user's memberships (never trusted blindly).
   - `PermissionsGuard` enforces `@RequirePermissions(...)`.
3. `ValidationPipe` (whitelist + transform) validates DTOs.
4. Handler executes; `AuditInterceptor` records `@Audit()` actions.
5. `TransformInterceptor` wraps responses as `{ success, data, meta? }`.
   Health routes are exempt so Terminus payloads stay intact.
6. `AllExceptionsFilter` normalises errors; Terminus health errors pass through.

## Data layer

- Prisma + PostgreSQL. Money stored as integer **minor units**.
- Every tenant-owned table is reachable from `Organization` and scoped by
  `organizationId`/`schoolId` at the query level.
- Soft deletes via `deletedAt` on the major entities.

## Front caching

- TanStack Query for server state; Zustand for auth/session UI state.
- `CacheService` (Redis) is used server-side for principal caching and short-
  lived tokens, with an in-memory fallback for single-instance/dev runs.
