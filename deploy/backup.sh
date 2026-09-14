#!/usr/bin/env bash
# Backup diário da base de dados do CRM.
#   0 3 * * * /var/www/crm/deploy/backup.sh
set -euo pipefail

ORIGEM="${DATABASE_PATH:-/var/www/crm/data/crm.sqlite}"
DESTINO="${BACKUP_DIR:-/var/backups/crm}"
DIAS_A_MANTER="${BACKUP_DIAS:-30}"

mkdir -p "$DESTINO"
CARIMBO=$(date +%Y-%m-%d_%H%M)

# .backup garante uma cópia consistente mesmo com a aplicação a correr.
sqlite3 "$ORIGEM" ".backup '$DESTINO/crm-$CARIMBO.sqlite'"
gzip -f "$DESTINO/crm-$CARIMBO.sqlite"

find "$DESTINO" -name 'crm-*.sqlite.gz' -mtime +"$DIAS_A_MANTER" -delete
echo "Backup criado: $DESTINO/crm-$CARIMBO.sqlite.gz"
