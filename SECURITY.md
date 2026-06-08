# Security Checklist — Root.VCR

Status as of STEP 11 (2026-06-08). Each item links to the enforcing code.

| # | Control | Status | Evidence |
|---|---------|--------|----------|
| 1 | All endpoints use a `requireXxx` / role guard | ✅ | `src/middleware.ts` (role areas) + `src/lib/api-helpers.ts` (`requireSuperAdmin` / `requireTenantAdmin` / `requireReseller` / `requireAuth`). 50/50 `route.ts` guarded; cron routes use `CRON_SECRET`. |
| 2 | No Prisma query skips the tenant filter (except Super Admin) | ✅ | `src/lib/prisma-tenant.ts` `getTenantPrisma()` auto-injects `tenant_id`; `tenant_id NOT NULL` in `prisma/schema.prisma`. Cross-tenant lookups (global `@unique`) use raw `prisma` intentionally. Verified by `src/tests/multi-tenant.test.ts`. |
| 3 | MikroTik password encrypted at rest | ✅ | `src/lib/crypto.ts` (AES-256-GCM); stored as `mikrotik_password_enc`. Round-trip + tamper tests in `src/tests/lib/crypto.test.ts`. |
| 4 | MikroTik password not exposed in tenant-admin API responses | ✅ | `src/lib/tenant-select.ts` `TENANT_DETAIL_SELECT` omits `mikrotik_password_enc`; asserted in `src/tests/lib/tenant-select.test.ts`. |
| 5 | Payment proof upload limited to the tenant's own invoice | ✅ | `src/app/api/uploads/payment-proof/route.ts` rejects when `user.tenantId !== invoice.tenant_id` (non-super-admin). |
| 6 | File upload validation (size, MIME, extension) | ✅ | Same route: 2 MB max, MIME ∈ {jpeg,png,pdf}, extension allow-list. |
| 7 | Rate limiting | ✅ | `src/lib/rate-limit.ts` (in-memory fixed window) via `enforceRateLimit`. Applied to login (`src/lib/auth.ts`, 10/5 min/IP), payment-proof upload (10/min/IP) and voucher generate (20/min/IP). **Caveat:** per-process memory — see "Known limitations". Unit tests: `src/tests/lib/rate-limit.test.ts`. |
| 8 | CSRF protection | ✅ | Session cookie `SameSite=lax` + `Secure` in prod (`src/lib/auth.config.ts`); explicit same-origin (Origin/Referer) guard `assertSameOrigin` on state-changing routes (`src/lib/security.ts`). Auth.js provides built-in CSRF for its own auth flows. Unit tests: `src/tests/lib/security.test.ts`. |
| 9 | HTTPS enforced in production | ✅ (deploy) | Enforced at the reverse proxy (Caddy auto-HTTPS / nginx + HSTS). See `DEPLOYMENT.md`. The app sets `useSecureCookies` and `trustHost` in production. |

## Known limitations

- **Rate limiting is per-process and in-memory.** Counters reset on
  deploy/restart and are not shared across instances. This is adequate for a
  single-instance Proxmox deployment. For horizontal scaling, replace the store
  in `src/lib/rate-limit.ts` with Redis/Upstash (the `checkRateLimit` interface
  is unchanged).
- **Same-origin guard allows requests with no `Origin`/`Referer`** (non-browser
  clients such as curl or server-to-server). Browsers always send `Origin` on
  cross-site state-changing requests, so this still blocks browser CSRF; those
  callers remain gated by auth + SameSite cookies.

## Operational

- Rotate `APP_ENCRYPTION_KEY` only with a re-encryption migration — changing it
  orphans existing encrypted MikroTik passwords.
- Keep `CRON_SECRET`, `AUTH_SECRET`, and `APP_ENCRYPTION_KEY` out of version
  control; provision via the host `.env` with `600` permissions.
- Reporting a vulnerability: contact the maintainer privately before public
  disclosure.
