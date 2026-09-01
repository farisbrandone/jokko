#!/bin/sh
# Sauvegarde PostgreSQL → MinIO/S3, avec rétention.
# Prévu pour tourner dans le service compose `pg-backup` (profil `tools`) ou en cron hôte.
#
#   PGHOST, PGUSER, PGPASSWORD, PGDATABASE   connexion
#   S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, BACKUP_BUCKET  cible
#   RETENTION_DAYS (def. 14)
set -eu

RETENTION_DAYS="${RETENTION_DAYS:-14}"
BACKUP_BUCKET="${BACKUP_BUCKET:-jokko-backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="/tmp/${PGDATABASE}-${STAMP}.sql.gz"

echo "[backup] dump ${PGDATABASE} → ${FILE}"
pg_dump --no-owner --no-privileges "$PGDATABASE" | gzip -9 > "$FILE"

mc alias set store "$S3_ENDPOINT" "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null
mc mb --ignore-existing "store/${BACKUP_BUCKET}" >/dev/null
mc cp "$FILE" "store/${BACKUP_BUCKET}/${PGDATABASE}/${STAMP}.sql.gz"
rm -f "$FILE"

echo "[backup] purge > ${RETENTION_DAYS} j"
mc rm --recursive --force --older-than "${RETENTION_DAYS}d" \
  "store/${BACKUP_BUCKET}/${PGDATABASE}/" || true

echo "[backup] ok — store/${BACKUP_BUCKET}/${PGDATABASE}/${STAMP}.sql.gz"

# Restauration :
#   mc cp store/jokko-backups/jokko/<STAMP>.sql.gz - | gunzip | psql "$PGDATABASE"
