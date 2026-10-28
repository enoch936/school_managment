# Backup & Disaster Recovery Runbook

## 1. Objectives & Metrics

- **Recovery Point Objective (RPO)**: <= 1 hour (frequency of WAL archiving / automated backups).
- **Recovery Time Objective (RTO)**: <= 30 minutes (time required to restore from archive and resume traffic).

---

## 2. Automated Backup Strategy

Automated backups are executed by `scripts/backup-db.sh`, typically triggered via a cron job on the database host or container.

### 2.1 Backup Script Workflow
1. Invokes `pg_dump` with compressed plain-text output (`gzip`).
2. Calculates and verifies archive SHA-256 and `gzip -t` integrity.
3. Automatically prunes backups older than the configurable retention window (default: 30 days).
4. Emits structured status messages to syslog / operational logs.

```bash
# Manual execution
export PGDATABASE=sms
export PGUSER=sms
export PGPASSWORD=secret_password
export BACKUP_DIR=/var/backups/sms-postgres
./scripts/backup-db.sh
```

---

## 3. Database Restoration Procedure

In the event of database corruption, ransomware, or host failure:

1. **Stop Incoming Traffic**:
   ```bash
   docker compose stop backend
   ```
2. **Decompress and Verify the Target Archive**:
   ```bash
   gunzip -t /var/backups/sms-postgres/sms_backup_TARGET.sql.gz
   ```
3. **Restore the Schema and Data**:
   ```bash
   dropdb -h localhost -U sms sms
   createdb -h localhost -U sms sms
   gunzip -c /var/backups/sms-postgres/sms_backup_TARGET.sql.gz | psql -h localhost -U sms -d sms
   ```
4. **Run Pending Migrations**:
   ```bash
   pnpm --filter @sms/backend prisma:deploy
   ```
5. **Restart Application & Run Health Checks**:
   ```bash
   docker compose start backend
   curl -f http://localhost:4000/api/v1/monitoring/health
   ```
