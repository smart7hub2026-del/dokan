#!/usr/bin/env bash
# نمونه بکاپ PostgreSQL — pg_dump در PATH، DATABASE_URL در env
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$(dirname "$0")/../server/backups/pg-${STAMP}.dump"
mkdir -p "$(dirname "$OUT")"
pg_dump "$DATABASE_URL" -Fc -f "$OUT"
echo "Wrote $OUT"
