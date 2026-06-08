# STEP 10 — Audit Log & Monitoring (Design)

**Date:** 2026-06-08
**Status:** Approved — ready for implementation plan
**Context:** Multitenant rollout. Tenant Admin self-service (STEP 9) complete. This step adds a
complete audit trail across privileged actions and a Super Admin monitoring dashboard.

## Background / Current State

Much of the audit infrastructure already exists and must be **reused, not rebuilt**:

- `src/lib/audit.ts` exports `writeAuditLog({ action, userId, tenantId, resource, metadata, req })`.
  It auto-extracts IP (`x-forwarded-for` → `x-real-ip` → `cf-connecting-ip`) and user-agent (truncated
  to 500 chars), and is **best-effort**: failures are logged to console and never fail the business
  operation.
- The `AuditLog` Prisma model already exists (`audit_logs` table) with columns
  `id, tenant_id?, user_id?, action, resource?, metadata(Json), ip_address?, user_agent?, created_at`
  and indexes on `tenant_id`, `user_id`, `created_at`. `tenant_id` is nullable on purpose
  (system-level events before tenant resolution). **No schema change required.**
- `writeAuditLog` is already called by ~18 routes: tenant create/update/suspend/activate/
  extend-trial/convert-from-trial, mikrotik test-connection, invoice create/verify/reject,
  bank-account create/update/delete/reorder, plan create/update.
- The `Tenant` model already stores `mikrotik_last_test_at` and `mikrotik_last_test_ok`, plus
  `mikrotik_last_edited_by/at`. The monitoring page reads these cached values instead of connecting
  live to every RouterOS.

### Established patterns to follow

- Super Admin pages: server component, `requireSuperAdmin()` from `@/lib/api-helpers` → `redirect`
  on error, server-side Prisma query, paginate 20/page, hand rows to a `*Client` component for
  interactivity (see `src/app/super-admin/invoices/page.tsx` + `_components/InvoiceListClient.tsx`).
- Crons: protect with `Authorization: Bearer $CRON_SECRET`, accept GET/POST, per-tenant try/catch
  (see `src/app/api/cron/check-trial-expiry/route.ts`).
- Radix Dialog is already a dependency (`@radix-ui/react-dialog`) for the metadata modal.

## Decisions (locked)

1. **MikroTik status freshness:** Cached display + health-check cron + manual "Test now" button.
   The monitoring page polls a lightweight DB-read endpoint every 30s; a cron refreshes the cached
   `mikrotik_last_test_ok/at`. No live RouterOS connections on page load. (Rejected: true live-poll
   of all routers every 30s — too heavy/fragile at scale.)
2. **Auth events:** Log `user.login`, `user.login_failed`, and `user.logout`. Logout is best-effort
   via NextAuth `events.signOut` and may lack IP/user-agent.

## Scope

### Item 1 — Audit helper
- Keep `writeAuditLog` as the canonical implementation.
- Add a `logAction` named export in `src/lib/audit.ts` that is a thin alias of `writeAuditLog`
  (same signature), so the name from the STEP 10 brief works without duplicating logic.
- No schema migration.

### Item 2 — Fill audit-logging gaps
Only the missing call sites (existing ones stay as-is):

| Action | Location | Notes |
|---|---|---|
| `user.login` | `src/lib/auth.ts` `authorize()` (both providers) on success | metadata: `{ provider, email, role }`; IP/UA from the `request` arg |
| `user.login_failed` | `src/lib/auth.ts` `authorize()` on each failure return | metadata: `{ provider, email, reason }` (e.g. `bad_password`, `no_user`, `inactive`, `wrong_tenant`); `userId` null if unknown |
| `user.logout` | `src/lib/auth.ts` `events.signOut` (auth config) | best-effort; metadata from token if available; IP/UA may be absent |
| `voucher.batch_generated` | `src/app/api/vouchers/generate/route.ts` after success | metadata: `{ count, profile, generated_by_role }`; covers reseller (same route) |
| `mikrotik.config_changed` | tenant-admin MikroTik settings route (`src/app/api/settings/mikrotik`) **and** super-admin tenant PATCH when mikrotik_* fields change | super-admin path emits this **in addition to** existing `tenant.updated` |
| `subscription.extended` | `src/lib/invoice.ts` `verifyPayment` | metadata: `{ invoice_id, new_subscription_end_at }` |
| `subscription.changed_plan` | wherever plan changes (verifyPayment / convert-from-trial path) | metadata: `{ from_plan_id, to_plan_id }` |

All new calls are best-effort and must not break their host operation.

### Item 3 — Audit Logs UI: `src/app/super-admin/audit-logs/page.tsx`
- Server component, `requireSuperAdmin()`, paginate 20/page.
- Filters via `searchParams`: `tenantId`, `userId`, `action`, `from`, `to` (date range), `page`.
  Date range filters `created_at`. Build a `Prisma.AuditLogWhereInput` mirroring the invoices page.
- Include `tenant { name, slug }` and `user { name, email }` for display (user via a manual lookup —
  AuditLog has no user relation; resolve `user_id`s in a batched `findMany`).
- `_components/AuditLogListClient.tsx`: filter bar + table + Radix Dialog modal showing full
  `metadata` (pretty JSON), `ip_address`, `user_agent`, `resource`, timestamp.
- CSV export: `GET /api/super-admin/audit-logs/export` — same filters, no pagination, streams
  `text/csv` with `Content-Disposition: attachment`. Columns: created_at, tenant, user, action,
  resource, ip_address, user_agent, metadata(JSON-encoded). Cap rows (e.g. 10k) to avoid runaway.

### Item 4 — Monitoring UI: `src/app/super-admin/monitoring/page.tsx`
- Server component renders initial data; `_components/MonitoringClient.tsx` polls
  `GET /api/super-admin/monitoring/status` every 30s (setInterval, cleared on unmount).
- Status endpoint returns all panel data in one payload (single round-trip per poll):
  1. **MikroTik status grid** — per active tenant: `mikrotik_last_test_ok`, `mikrotik_last_test_at`,
     staleness flag (e.g. stale if older than 2× cron interval). Per-row "Test now" button calls the
     existing `POST /api/super-admin/tenants/[id]/test-mikrotik`, then refetches status.
  2. **Activity feed** — latest ~20 audit logs (action, actor, tenant, time).
  3. **Top 10 tenants by voucher sales today** — vouchers with status used / sold today, grouped by
     tenant, ordered desc, limit 10. (Confirm "sold" field during impl — likely `used_at`/status.)
  4. **Trials expiring within 3 days** — `is_trial = true`, `trial_end_at` between now and now+3d.
  5. **Invoices `AWAITING_VERIFICATION`** — count + links to `/super-admin/invoices/[id]`.

### Item 5 — Health-check cron: `src/app/api/cron/mikrotik-health-check/route.ts`
- `Authorization: Bearer $CRON_SECRET`, GET/POST.
- Iterate active tenants; for each, `testMikrotikConnection(tenantId)` (from `src/lib/mikrotik.ts`),
  update `mikrotik_last_test_ok/at`. Per-tenant try/catch so one failure doesn't abort the run.
- Returns a summary `{ checked, ok, failed }`. (Optional: a single `mikrotik.health_check` summary
  audit log — not per tenant, to avoid log spam.)

### Item 6 — Nav + verification
- Add `/super-admin/audit-logs` and `/super-admin/monitoring` entries to
  `src/components/layout/nav-config.ts` (super-admin section).
- Unit tests (vitest, like `src/tests/lib/invoice.test.ts`): voucher-sales-today aggregation helper
  and the audit-log date-range `where`-builder. Extract those into testable pure functions.
- Gate: `npx tsc --noEmit` and `npx next lint` → 0 errors / 0 warnings.

## Out of Scope (YAGNI)
- WebSockets / SSE — 30s polling is sufficient.
- Live-poll of all routers on every page load — replaced by cached + cron.
- Audit-log retention / archival / pruning.
- Alerting / notifications on monitoring thresholds.

## Risks / Notes
- NextAuth v5 beta `authorize(credentials, request)` — confirm the `request` arg is available for
  IP/UA extraction; if not, log without IP (still best-effort). `events.signOut` payload shape
  varies — extract `userId`/`tenantId` defensively.
- Voucher "sold today" semantics must be confirmed against the `Voucher` model during impl.
- CSV export must enforce the same `requireSuperAdmin` guard and a row cap.
