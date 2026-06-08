# Root.VCR — Multi-Tenant Hotspot Voucher Platform

A multi-tenant voucher/billing platform for MikroTik hotspot operators. One
deployment serves many independent **tenants** (operators); each tenant manages
its own resellers, vouchers, profiles and MikroTik router. A central **Super
Admin** manages tenants, subscription plans, and manual-transfer billing.

- **Framework:** Next.js 14 (App Router) · TypeScript
- **DB:** PostgreSQL via Prisma 5
- **Auth:** Auth.js (NextAuth) v5 — credentials, role-based
- **Router integration:** RouterOS API (`routeros-client`)

## Roles

| Role | Logs in with | Scope |
|------|--------------|-------|
| `SUPER_ADMIN` | email + password (`/super-admin/login`) | All tenants; no `tenant_id` |
| `TENANT_ADMIN` | tenant code + email + password (`/login`) | One tenant |
| `RESELLER` | tenant code + email + password (`/login`) | One tenant; own vouchers |

Tenant isolation is enforced at two layers: `tenant_id NOT NULL` on tenant-scoped
tables, and a Prisma extension (`getTenantPrisma`) that auto-injects the
`tenant_id` filter on every query. See `docs/superpowers/specs/` for design docs
and `SECURITY.md` for the security posture.

## Local setup

Prerequisites: Node 20+, PostgreSQL 14+.

```bash
# 1. Install deps
npm ci

# 2. Configure env
cp .env.example .env.local
#   Generate secrets:
#     openssl rand -base64 32   # AUTH_SECRET / NEXTAUTH_SECRET
#     openssl rand -hex 32      # APP_ENCRYPTION_KEY  (must be 32 bytes)
#     openssl rand -hex 24      # CRON_SECRET
#   Set DATABASE_URL to your local Postgres.

# 3. Create schema + seed (4 plans, default tenant, super admin, bank accounts)
npm run db:migrate          # prisma migrate dev
npm run db:seed             # uses SUPER_ADMIN_PASSWORD

# 4. Run
npm run dev                 # http://localhost:3000
```

Default super admin: `superadmin@root.vcr` / `$SUPER_ADMIN_PASSWORD`. Change the
password after first login.

## Tests

```bash
npm run test:run            # unit/logic tests (no DB) — always safe to run
npm run test:integration    # multi-tenant DB tests — requires TEST_DATABASE_URL
```

The integration suite (`src/tests/multi-tenant.test.ts`) covers tenant isolation,
suspend→no-login, trial auto-expiry, and the payment flow against a **real**
disposable Postgres. It is **skipped** unless `TEST_DATABASE_URL` is set, and
refuses to run unless `DATABASE_URL === TEST_DATABASE_URL`:

```bash
createdb rootvcr_test
DATABASE_URL="postgresql://.../rootvcr_test" \
TEST_DATABASE_URL="postgresql://.../rootvcr_test" \
  npx prisma migrate deploy            # set up the test schema once
DATABASE_URL="postgresql://.../rootvcr_test" \
TEST_DATABASE_URL="postgresql://.../rootvcr_test" \
  npm run test:integration
```

> A green `npm run test:run` does **not** include the isolation tests — run
> `test:integration` against a test DB for full coverage.

## Verify & lint

```bash
npx tsc --noEmit
npm run lint
```

## Project layout

```
src/
  app/
    api/                 # route handlers (all guarded; see SECURITY.md)
      cron/              # CRON_SECRET-protected jobs
    super-admin/         # Super Admin UI
    (dashboard)/         # tenant admin + reseller UI
  lib/                   # auth, prisma, tenant scoping, crypto, rate-limit, security
  tests/                 # vitest (lib/ = units, multi-tenant.test.ts = integration)
prisma/                  # schema + seed
scripts/                 # deploy.sh, backup.sh
docs/superpowers/specs/  # design specs
```

## Production

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the Proxmox deploy guide (reverse
proxy + HTTPS, systemd, cron, backups, monitoring) and **[SECURITY.md](./SECURITY.md)**
for the security checklist. Customer-facing help is in
**[USER_GUIDE_TENANT_ADMIN.md](./USER_GUIDE_TENANT_ADMIN.md)**.
