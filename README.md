# School Management System

Enterprise, multi-tenant School Management System. Monorepo with a Next.js web
app and a NestJS API backed by PostgreSQL (Prisma) and Redis.

## Stack

- **Frontend** (`frontend/`): Next.js 15 App Router, React 19, TypeScript, Tailwind, shadcn/ui, TanStack Query, Zustand.
- **Backend** (`backend/`): NestJS 11, Prisma 6, PostgreSQL, Redis/BullMQ, Passport JWT, argon2, TOTP MFA.
- **Tooling**: pnpm workspaces, ESLint, Prettier, Jest + Supertest, Vitest, Playwright.

## Prerequisites

- Node >= 20.11, pnpm >= 9
- PostgreSQL 16 and Redis 7 (locally via `docker compose up -d`, or installs)

## Getting started

```bash
pnpm install
cp .env.example .env            # fill in secrets
cp backend/.env.example backend/.env
docker compose up -d            # postgres + redis + mailhog
pnpm --filter @sms/backend prisma:generate
pnpm --filter @sms/backend prisma:migrate
pnpm --filter @sms/backend prisma:seed
pnpm dev
```

- API: http://localhost:4000 (Swagger at `/api/docs`)
- Web: http://localhost:3000

## Common commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Run backend + frontend in parallel |
| `pnpm build` | Build both apps |
| `pnpm typecheck` | Type-check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Unit tests (Jest + Vitest) |
| `pnpm test:e2e` | Backend e2e (Supertest) |
| `pnpm db:migrate` / `db:seed` | Prisma migrate / seed |

## Documentation

See `docs/` for architecture, authentication/authorization, tenant isolation,
deployment, and the current implementation status (`docs/implementation-status.md`).
