# Operations & SRE Runbook

## 1. System Health Monitoring

The application provides health endpoints at `/health` and `/api/v1/monitoring/health`.

### 1.1 Health Probe Structure
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" }
  }
}
```

### 1.2 Health Check Commands
```bash
# Backend liveness
curl -I http://localhost:4000/health

# Readiness check (probes PostgreSQL database connectivity)
curl -I http://localhost:4000/health/ready

# Frontend liveness
curl -I http://localhost:3000/
```

---

## 2. Standard Operating Procedures (SOPs)

### SOP 1: Deploying Database Migrations
1. Verify database connectivity:
   ```bash
   pnpm --filter @sms/backend prisma:studio
   ```
2. Apply migrations in production:
   ```bash
   pnpm --filter @sms/backend prisma:deploy
   ```
3. Never run `prisma migrate dev` or `prisma db push` against production databases.

### SOP 2: Flushing Redis Cache
If an inconsistent cache state is suspected:
```bash
redis-cli -a "$REDIS_PASSWORD" ping
redis-cli -a "$REDIS_PASSWORD" flushdb
```

### SOP 3: Rotating JWT Secrets
1. Generate new 64-byte high-entropy secrets:
   ```bash
   openssl rand -hex 64
   ```
2. Update `.env` or secret manager.
3. Perform rolling restarts of backend instances. Existing refresh tokens will require re-authentication.

### SOP 4: Investigating Incident / High Error Rate
1. Check Nginx access logs:
   ```bash
   tail -n 100 /var/log/nginx/access.log | grep -E " 50[0-9] "
   ```
2. Check backend Pino logs for exception stack traces:
   ```bash
   docker logs --tail 200 school-management-backend-1 | grep "ERROR"
   ```
3. Check database connection pool status.
