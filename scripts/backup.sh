#!/bin/bash
# /opt/rootvcr/scripts/backup.sh

BACKUP_DIR="/opt/rootvcr/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

mkdir -p $BACKUP_DIR

pg_dump -U rootvcr -h localhost rootvcr > $BACKUP_DIR/db_$DATE.sql
gzip $BACKUP_DIR/db_$DATE.sql

tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/rootvcr/public/uploads 2>/dev/null || true

find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
