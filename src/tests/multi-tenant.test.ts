/**
 * Multi-tenant isolation & critical-flow integration tests.
 *
 * GATED: runs only when `TEST_DATABASE_URL` is set (and must equal
 * `DATABASE_URL` — see src/tests/helpers/db.ts). Skipped otherwise so the
 * default `npm test` stays green without a database.
 *
 *   DATABASE_URL=$TEST_DATABASE_URL npm run test:integration
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { NextRequest } from "next/server"
import { prisma, seed, cleanup, type SeedIds } from "./helpers/db"
import { getTenantPrisma } from "@/lib/prisma-tenant"
import { tenantCanLogin } from "@/lib/login-eligibility"
import { generateInvoice, verifyPayment, rejectPayment } from "@/lib/invoice"

const RUN = !!process.env.TEST_DATABASE_URL

describe.skipIf(!RUN)("multi-tenant isolation & flows (integration)", () => {
  let ids: SeedIds

  beforeAll(async () => {
    ids = await seed()
  }, 30_000)

  afterAll(async () => {
    await cleanup()
    await prisma.$disconnect()
  })

  it("tenant A scope cannot read tenant B data", async () => {
    const dbA = getTenantPrisma(ids.tenantA.id, prisma)

    const vouchers = await dbA.voucher.findMany()
    expect(vouchers.length).toBeGreaterThan(0)
    expect(vouchers.every((v) => v.tenant_id === ids.tenantA.id)).toBe(true)

    // Tenant B's voucher id is invisible under tenant A's scope.
    const leaked = await dbA.voucher.findUnique({ where: { id: ids.tenantB.voucherId } })
    expect(leaked).toBeNull()
  })

  it("super admin (unscoped) can read both tenants' data", async () => {
    const all = await prisma.voucher.findMany({
      where: { tenant_id: { in: [ids.tenantA.id, ids.tenantB.id] } },
    })
    const seen = new Set(all.map((v) => v.tenant_id))
    expect(seen.has(ids.tenantA.id)).toBe(true)
    expect(seen.has(ids.tenantB.id)).toBe(true)
  })

  it("reseller sees only their own vouchers (tenant + user_id scoped)", async () => {
    const dbA = getTenantPrisma(ids.tenantA.id, prisma)
    const mine = await dbA.voucher.findMany({ where: { user_id: ids.tenantA.resellerId } })
    expect(mine.length).toBeGreaterThan(0)
    expect(
      mine.every((v) => v.user_id === ids.tenantA.resellerId && v.tenant_id === ids.tenantA.id),
    ).toBe(true)
  })

  it("stores the MikroTik password encrypted, never as plaintext", async () => {
    const t = await prisma.tenant.findUnique({
      where: { id: ids.tenantA.id },
      select: { mikrotik_password_enc: true },
    })
    expect(t?.mikrotik_password_enc).toBeTruthy()
    expect(t?.mikrotik_password_enc).not.toBe("router-secret")
  })

  it("suspending a tenant blocks login (tenantCanLogin is false)", async () => {
    await prisma.tenant.update({ where: { id: ids.tenantB.id }, data: { is_active: false } })
    const suspended = await prisma.tenant.findUnique({
      where: { id: ids.tenantB.id },
      select: { is_active: true },
    })
    expect(tenantCanLogin(suspended!)).toBe(false)
    // restore for independence
    await prisma.tenant.update({ where: { id: ids.tenantB.id }, data: { is_active: true } })
  })

  it("trial auto-expire: the cron suspends a tenant past its trial", async () => {
    process.env.CRON_SECRET = "test-cron-secret"
    const { GET } = await import("@/app/api/cron/check-trial-expiry/route")
    const req = new NextRequest("http://localhost/api/cron/check-trial-expiry", {
      headers: { authorization: "Bearer test-cron-secret" },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const trial = await prisma.tenant.findUnique({
      where: { id: ids.trialTenant.id },
      select: { is_active: true },
    })
    expect(trial?.is_active).toBe(false)
  })

  it("payment flow: verify extends subscription, reject returns to PENDING", async () => {
    const periodStart = new Date("2026-07-01T00:00:00.000Z")
    const periodEnd = new Date("2026-08-01T00:00:00.000Z")

    const inv = await generateInvoice({
      tenantId: ids.tenantA.id,
      tenantSlug: ids.tenantA.slug,
      planPrice: 100000,
      periodStart,
      periodEnd,
    })
    expect(inv.status).toBe("PENDING")

    // Simulate the proof upload step that moves it to AWAITING_VERIFICATION.
    await prisma.subscriptionInvoice.update({
      where: { id: inv.id },
      data: { status: "AWAITING_VERIFICATION" },
    })

    const verified = await verifyPayment({
      invoiceId: inv.id,
      verifiedBy: ids.superAdminId,
      paymentMethod: "transfer",
      paidAt: new Date(),
    })
    expect(verified.status).toBe("PAID")

    const tenantAfter = await prisma.tenant.findUnique({
      where: { id: ids.tenantA.id },
      select: { subscription_end_at: true, is_trial: true },
    })
    expect(tenantAfter?.subscription_end_at?.toISOString()).toBe(periodEnd.toISOString())
    expect(tenantAfter?.is_trial).toBe(false)

    // Reject path on a fresh invoice.
    const inv2 = await generateInvoice({
      tenantId: ids.tenantA.id,
      tenantSlug: ids.tenantA.slug,
      planPrice: 100000,
      periodStart,
      periodEnd,
    })
    await prisma.subscriptionInvoice.update({
      where: { id: inv2.id },
      data: { status: "AWAITING_VERIFICATION" },
    })
    const rejected = await rejectPayment({ invoiceId: inv2.id, reason: "bukti transfer buram" })
    expect(rejected.status).toBe("PENDING")
    expect(rejected.rejected_reason).toBe("bukti transfer buram")
  })
})
