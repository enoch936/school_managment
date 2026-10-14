# Deployment

## Services

- PostgreSQL 16 (managed or container), Redis 7, an SMTP provider, and object
  storage (Cloudinary or S3-compatible) for private documents.

## Backend

```bash
pnpm install --frozen-lockfile
pnpm --filter @sms/backend prisma:generate
pnpm --filter @sms/backend prisma:deploy   # apply migrations
pnpm --filter @sms/backend build
node backend/dist/main.js
```

Required environment: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET` (both >= 32 chars), `CORS_ORIGINS`, `COOKIE_DOMAIN`,
`COOKIE_SECURE=true` in production. See `.env.example`.

- Liveness: `GET /health`; Readiness: `GET /health/ready`.
- Swagger: `/api/docs` (disable in production if not desired).

## Frontend

```bash
pnpm --filter @sms/frontend build
pnpm --filter @sms/frontend start
```

Set `NEXT_PUBLIC_API_URL` to the public API origin.

## Notes

- Run at least one Redis instance shared across API replicas (cache + rate
  limiting + socket rooms). Attach the Socket.IO Redis adapter when scaling out.
- Terminate TLS at the edge; the API sets `Secure` cookies in production.
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests, and builds for
  both apps. Database-backed integration tests require a Postgres service.
