# STEP 11 — Final Preparation (Design)

**Date:** 2026-06-08
**Status:** Approved — ready for implementation plan
**Context:** Multitenant rollout. Super Admin & Tenant Admin features built (STEP 1–10). This step
hardens, tests, documents, and prepares the app for production deployment on Proxmox.

## Premise Correction (read first)

In **this repository**, STEP 10's monitoring page, audit-logs page, and the mikrotik-health-check
cron are **not implemented** — only the STEP 10 design spec was written. Only two cron endpoints
exist today: `src/app/api/cron/check-trial-expiry/route.ts` and
`src/app/api/cron/auto-generate-invoices/route.ts`. STEP 11 documents and tests **what actually
exists**; it does not document unbuilt features. If STEP 10 was implemented elsewhere, the cron-setup
docs note the third cron as conditional.

## Audit Findings (current state, verified 2026-06-08)

**Security — mostly green, two real gaps:**
- Route guards: 50/50 `route.ts` protected (48 via `require*`/`getTenantScope`, payment-proof via
  `requireAuth`; middleware enforces role areas). NextAuth handler is correctly the only unguarded file.
- Tenant filtering enforced at schema (`tenant_id` NOT NULL) and runtime (`getTenantPrisma` extension).
- MikroTik password: encrypted (AES-256-GCM, `src/lib/crypto.ts`); `TENANT_DETAIL_SELECT` excludes
  `mikrotik_password_enc`, so it is not exposed in responses.
- Upload (payment-proof): tenant-scoped + 2MB size + MIME + extension validation.
- **Rate limiting: NOT present** (the `rate-limit` grep hits are MikroTik bandwidth config).
- **CSRF:** NextAuth covers its own auth flows; other mutations rely on SameSite session cookies —
  no explicit CSRF tokens / origin checks.
- HTTPS: deployment-level (reverse proxy), not application code.

**Test infra:** only vitest unit tests (`src/tests/lib/invoice.test.ts`), `environment: node`, no test
database. Isolation/login/payment tests need a DB to prove anything.

**Docs/scripts:** `README.md` + `.env.example` exist; `DEPLOYMENT.md`,
`USER_GUIDE_TENANT_ADMIN.md`, `scripts/deploy.sh` do **not**. `.env.example` is **missing
`CRON_SECRET`** (required by both cron routes) and still lists legacy single-tenant `MIKROTIK_*`
vars (now per-tenant, encrypted in DB). No health endpoint exists.

## Decisions (locked)

1. **Test strategy: Hybrid.** DB-dependent tests gated by `TEST_DATABASE_URL` (auto-skip when
   absent); pure logic as always-on unit tests.
2. **Security gaps: implement lightweight now** (in-memory rate limiter + CSRF/cookie hardening) so
   the checklist can be truthfully green, rather than documenting them as deferred gaps.

## Scope

### Workstream 1 — Test suite (`src/tests/multi-tenant.test.ts` + units)
- **Integration (gated):** `describe.skipIf(!process.env.TEST_DATABASE_URL)`. A harness module
  (`src/tests/helpers/db.ts`) connects a `PrismaClient` to `TEST_DATABASE_URL`, runs
  `prisma migrate deploy` (or `db push`) once, and seeds fixtures: tenant A & tenant B, each with a
  TENANT_ADMIN + RESELLER + vouchers + profiles; one SUPER_ADMIN. `afterAll` truncates the seeded
  data. Cases:
  - **Isolation:** `getTenantPrisma(A)` returns zero of tenant B's vouchers/profiles/wallets; a
    direct `db.voucher.findUnique` for B's id under scope A yields null.
  - **Super admin:** raw `prisma` (no scope) sees rows from both tenants.
  - **Reseller:** reseller queries scoped to their `tenant_id` AND `reseller_id` see only own vouchers.
  - **Suspend → no login:** with tenant `is_active=false`, the `tenant-login` `authorize()` path
    returns null.
  - **Trial auto-expire:** the check-trial-expiry logic suspends a tenant whose `trial_end_at` is in
    the past (extract the pure decision into a testable function if not already).
  - **Payment flow:** `generateInvoice` → `verifyPayment` extends `subscription_end_at` and sets
    `PAID`; `rejectPayment` returns status to `PENDING`.
- **Unit (always-on, no DB):**
  - `crypto`: `decrypt(encrypt(x)) === x`, `encrypt(x) !== x`, ciphertext shape (iv:tag:data).
  - **Password-not-exposed:** assert the tenant DTO / `TENANT_DETAIL_SELECT` (export it if needed)
    has no `mikrotik_password_enc` key. Same assertion for any tenant-admin read DTO.
- **Tooling:** add `"test:integration"` script; integration tests need a longer timeout. Keep the
  default `npm test` running only the always-on units so CI without a DB stays green.

### Workstream 2 — Security hardening + checklist
- `src/lib/rate-limit.ts`: in-memory fixed-window limiter keyed by IP (reuse the IP extraction logic
  from `src/lib/audit.ts`), `checkRateLimit(key, { limit, windowMs })` → `{ ok, retryAfter }`.
  Applied in handlers of: login callback (auth attempts), payment-proof upload, voucher generate.
  Over-limit returns **429** with `Retry-After`. Documented caveat: per-instance memory; swap to
  Redis/Upstash for multi-instance. (Not edge middleware — node route handlers, for reliability.)
- CSRF/cookie hardening: verify/ set NextAuth cookies `sameSite: "lax"` + `secure` in production in
  `auth.config.ts`; add `assertSameOrigin(req)` helper (Origin/Referer check) usable by
  state-changing API routes; document the posture.
- `SECURITY.md`: the STEP 11 checklist, each item with **evidence (file:line refs)** and status.
  HTTPS marked "enforced at reverse proxy — see DEPLOYMENT.md".

### Workstream 3 — Documentation
- `README.md`: multi-tenant overview (3 roles), local setup (Postgres, `.env`, `prisma migrate dev`,
  seed), dev run, test commands, project structure pointer.
- `.env.example`: **add `CRON_SECRET`, `TEST_DATABASE_URL`**; annotate or remove legacy
  single-tenant `MIKROTIK_*`; clarify `AUTH_SECRET` vs `NEXTAUTH_SECRET`; ensure
  `APP_ENCRYPTION_KEY` + `SUPER_ADMIN_PASSWORD` have generation instructions; one comment per var.
- `DEPLOYMENT.md`: Proxmox deploy — provision Node + Postgres, clone, `npm ci`, env, `prisma migrate
  deploy`, seed super admin, `npm run build`, run under systemd, reverse proxy (Caddy or nginx) with
  HTTPS + HSTS, cron setup, backup, rollback notes.
- `USER_GUIDE_TENANT_ADMIN.md`: customer-facing (Indonesian) — login with tenant code + email,
  MikroTik setup + "Test Connection", managing resellers/vouchers, paying an invoice (upload bukti
  transfer), reading trial/subscription status.

### Workstream 4 — `scripts/deploy.sh`
Bash, `set -euo pipefail`, logs each step. Sequence: `npm ci` → `npx prisma migrate deploy` →
`npm run build` → restart service (`systemctl restart` or pm2, parameterized) → **health check**
(curl `/api/health`, retry with backoff, non-zero exit on failure). Requires a health endpoint, so
add `src/app/api/health/route.ts` — returns `{ status: "ok" }` (200) after a lightweight
`SELECT 1` DB ping, `503` on DB failure. Health route is public (excluded from auth) and rate-limited.

### Workstream 5 — Production monitoring (docs, in DEPLOYMENT.md)
- Log rotation: pm2-logrotate config or systemd journald + a `logrotate` sample.
- Error tracking (optional): Sentry setup notes + env var, no hard dependency added.
- Uptime: external monitor (UptimeRobot / healthchecks.io) hitting `/api/health`.
- Cron setup: system crontab entries calling the two existing endpoints with
  `Authorization: Bearer $CRON_SECRET` — `check-trial-expiry` (daily) and `auto-generate-invoices`
  (daily). Note the STEP 10 health-check cron as conditional (only if implemented).

## Sequencing
1. `/api/health` endpoint + security hardening (rate limiter, CSRF/cookie, same-origin helper).
2. Test suite (covers the new rate limiter + crypto + isolation).
3. Documentation (README, .env.example, DEPLOYMENT, USER_GUIDE, SECURITY).
4. `scripts/deploy.sh`.
5. Monitoring docs (folded into DEPLOYMENT.md).

## Out of Scope (YAGNI)
- Distributed/Redis rate limiting (in-memory is enough for single-instance Proxmox).
- Actually wiring Sentry (documented as optional only).
- Building STEP 10's monitoring/audit-logs pages or health-check cron.
- Log aggregation stacks (ELK/Loki).

## Risks / Notes
- Integration tests require a disposable Postgres; without `TEST_DATABASE_URL` they skip — CI must
  set it to actually exercise isolation. Document this clearly so a green `npm test` isn't mistaken
  for full coverage.
- In-memory rate limiting resets on deploy/restart and is per-process — acceptable for single
  instance; note the limitation in SECURITY.md.
- `prisma migrate deploy` in `deploy.sh` is irreversible forward-only; deploy script should back up
  the DB first (reuse `scripts/backup.sh`) before migrating.
- Confirm the exact reseller voucher-ownership field (`reseller_id` / created_by) against the
  `Voucher` model when writing the reseller isolation test.
