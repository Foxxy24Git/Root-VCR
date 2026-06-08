# Deployment Guide — Root.VCR on Proxmox

Target: a Debian/Ubuntu LXC container or VM on Proxmox, running Next.js behind a
reverse proxy with HTTPS. Adjust paths (`/opt/rootvcr`) and users as needed.

## 1. Provision

```bash
# On the Proxmox host: create an Ubuntu 22.04 LXC/VM, then inside it:
apt update && apt install -y curl git postgresql nginx
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

## 2. Database

```bash
sudo -u postgres psql <<'SQL'
CREATE USER rootvcr WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE rootvcr OWNER rootvcr;
SQL
```

## 3. App

```bash
sudo mkdir -p /opt/rootvcr && sudo chown "$USER" /opt/rootvcr
git clone <repo> /opt/rootvcr && cd /opt/rootvcr
npm ci

# Environment — see .env.example for every variable + how to generate secrets.
cp .env.example .env
#   DATABASE_URL=postgresql://rootvcr:STRONG_PASSWORD@localhost:5432/rootvcr?schema=public
#   NEXTAUTH_URL=https://app.example.com   (your real HTTPS host)
#   NODE_ENV=production
#   AUTH_SECRET / NEXTAUTH_SECRET  = openssl rand -base64 32
#   APP_ENCRYPTION_KEY             = openssl rand -hex 32
#   CRON_SECRET                    = openssl rand -hex 24
#   SUPER_ADMIN_PASSWORD           = strong password (first seed only)
chmod 600 .env

npx prisma migrate deploy
npm run db:seed            # creates plans, default tenant, super admin
npm run build
```

## 4. systemd service

`/etc/systemd/system/rootvcr.service`:

```ini
[Unit]
Description=Root.VCR
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/rootvcr
EnvironmentFile=/opt/rootvcr/.env
ExecStart=/usr/bin/npm run start
Restart=always
User=rootvcr
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now rootvcr
```

## 5. Reverse proxy + HTTPS (enforced here)

HTTPS is terminated at the proxy — the app itself is plain HTTP on localhost:3000.

**Option A — Caddy (automatic HTTPS, recommended):** `/etc/caddy/Caddyfile`
```
app.example.com {
    encode gzip
    reverse_proxy localhost:3000
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
}
```

**Option B — nginx + certbot:**
```nginx
server {
    listen 443 ssl http2;
    server_name app.example.com;
    # ssl_certificate ... (certbot)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
server { listen 80; server_name app.example.com; return 301 https://$host$request_uri; }
```

`X-Forwarded-For`/`X-Forwarded-Proto` must be passed through — the app relies on
them for rate-limiting (client IP) and secure cookies (`trustHost`).

## 6. Cron jobs

The app exposes cron logic as HTTP endpoints guarded by `CRON_SECRET`. Drive them
from the system crontab (`crontab -e`):

```cron
# Auto-suspend expired trials + flag trials expiring soon — daily 00:05
5 0 * * *  curl -fsS -H "Authorization: Bearer $CRON_SECRET" -X POST https://app.example.com/api/cron/check-trial-expiry >/dev/null
# Auto-generate subscription invoices (H-7 before expiry) — daily 00:15
15 0 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" -X POST https://app.example.com/api/cron/auto-generate-invoices >/dev/null
```

Export `CRON_SECRET` in the crontab environment (top of `crontab -e`) or inline
the literal value. (If a MikroTik health-check cron is added later, schedule it
here too, e.g. every 5 minutes.)

## 7. Deploy script

Subsequent releases:

```bash
cd /opt/rootvcr && git pull && ./scripts/deploy.sh
```

`scripts/deploy.sh` backs up the DB, installs deps, runs `prisma migrate deploy`,
builds, restarts the service, and polls `/api/health` until it returns 200 (fails
the deploy otherwise). Override `SERVICE_NAME` / `HEALTH_URL` via env if needed.

## 8. Monitoring

**Health endpoint:** `GET /api/health` → `200 {status:"ok"}` (DB reachable) or
`503` (DB down). Public, no auth.

**Uptime monitoring:** point an external monitor (UptimeRobot, healthchecks.io,
or Proxmox's own checks) at `https://app.example.com/api/health` every 1–5 min.
Alert on non-200.

**Log rotation:** systemd logs go to journald — cap retention:
```bash
sudo sed -i 's/#SystemMaxUse=.*/SystemMaxUse=500M/' /etc/systemd/journald.conf
sudo systemctl restart systemd-journald
journalctl -u rootvcr -f          # live logs
```
If running under pm2 instead, use `pm2 install pm2-logrotate`.

**Error tracking (optional):** Sentry is not bundled. To add it, install
`@sentry/nextjs`, run `npx @sentry/wizard@latest -i nextjs`, and set `SENTRY_DSN`
in `.env`. Skipping it leaves no hard dependency.

**Backups:** `scripts/backup.sh` dumps Postgres + uploads to `/opt/rootvcr/backups`
with `BACKUP_RETENTION_DAYS` retention. Schedule daily:
```cron
0 2 * * * /opt/rootvcr/scripts/backup.sh >> /var/log/rootvcr-backup.log 2>&1
```

## 9. Rollback

```bash
# Code: check out the previous tag/commit and re-run deploy
git checkout <previous-sha> && ./scripts/deploy.sh
# Database: restore the latest dump (taken automatically before each deploy)
gunzip -c /opt/rootvcr/backups/db_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql rootvcr
```

> Prisma migrations are forward-only. `deploy.sh` backs up before migrating;
> rolling back a schema change means restoring that dump.
