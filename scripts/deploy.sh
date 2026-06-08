#!/usr/bin/env bash
#
# Root.VCR production deploy script.
# Run from the app root on the production host (e.g. /opt/rootvcr):
#   ./scripts/deploy.sh
#
# Steps: backup DB -> install deps -> migrate -> build -> restart -> health check.
# Idempotent and fail-fast; any failed step aborts the deploy.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

SERVICE_NAME="${SERVICE_NAME:-rootvcr}"            # systemd unit, override if different
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-10}"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }

# Load env so DATABASE_URL etc. are available to prisma.
if [[ -f .env.local ]]; then set -a; source .env.local; set +a; fi
if [[ -f .env ]]; then set -a; source .env; set +a; fi

log "1/6 Backing up database (best-effort)"
if [[ -x scripts/backup.sh ]]; then
  scripts/backup.sh || echo "WARN: backup failed, continuing"
else
  echo "scripts/backup.sh not executable; skipping backup"
fi

log "2/6 Installing dependencies (npm ci)"
npm ci

log "3/6 Applying database migrations (prisma migrate deploy)"
npx prisma migrate deploy

log "4/6 Building production bundle (next build)"
npm run build

log "5/6 Restarting service ($SERVICE_NAME)"
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart "$SERVICE_NAME"
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart "$SERVICE_NAME"
else
  echo "ERROR: neither systemctl nor pm2 found — restart the app manually" >&2
  exit 1
fi

log "6/6 Health check ($HEALTH_URL)"
for i in $(seq 1 "$HEALTH_RETRIES"); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)"
  if [[ "$code" == "200" ]]; then
    log "Deploy OK — health check passed (HTTP 200)"
    exit 0
  fi
  echo "  attempt $i/$HEALTH_RETRIES: HTTP ${code:-none}, retrying in 3s..."
  sleep 3
done

echo "ERROR: health check did not return 200 after $HEALTH_RETRIES attempts" >&2
exit 1
