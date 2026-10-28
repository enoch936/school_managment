#!/usr/bin/env bash
# ==============================================================================
# Enterprise School Management System - Automated PostgreSQL Backup & Rotation
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/sms-postgres}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/sms_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

PG_HOST="${PGHOST:-localhost}"
PG_PORT="${PGPORT:-5432}"
PG_USER="${PGUSER:-sms}"
PG_DATABASE="${PGDATABASE:-sms}"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup for '${PG_DATABASE}' at ${TIMESTAMP}..."
PGPASSWORD="${PGPASSWORD:-}" pg_dump -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -F p "${PG_DATABASE}" | gzip -c > "${BACKUP_FILE}"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[INFO] Backup successfully created at '${BACKUP_FILE}' (Size: ${FILE_SIZE})"

# Verify integrity
if gzip -t "${BACKUP_FILE}"; then
  echo "[INFO] Backup archive integrity test passed."
else
  echo "[ERROR] Backup archive integrity check failed!" >&2
  exit 1
fi

# Rotate backups older than retention threshold
echo "[INFO] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "sms_backup_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} +
echo "[INFO] Backup procedure finished successfully."
