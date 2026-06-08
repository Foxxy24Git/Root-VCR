/**
 * Integration-test database harness.
 *
 * Only used by tests gated behind `TEST_DATABASE_URL`. To run integration tests
 * safely, point BOTH `DATABASE_URL` and `TEST_DATABASE_URL` at a disposable test
 * database, e.g.:
 *
 *   DATABASE_URL=$TEST_DATABASE_URL TEST_DATABASE_URL=postgresql://... \
 *     npm run test:integration
 *
 * `assertTestDb()` refuses to run unless the two URLs match, so the suite can
 * never seed/truncate a dev or production database.
 */
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/crypto"

export { prisma }

const SUPER_EMAIL = "test-super@root.vcr"
const TENANT_A_SLUG = "test-a"
const TENANT_B_SLUG = "test-b"
const TRIAL_SLUG = "test-trial"
const ALL_SLUGS = [TENANT_A_SLUG, TENANT_B_SLUG, TRIAL_SLUG]

export interface SeedIds {
  superAdminId: string
  tenantA: { id: string; slug: string; adminId: string; resellerId: string; profileId: string; voucherId: string }
  tenantB: { id: string; slug: string; adminId: string; resellerId: string; profileId: string; voucherId: string }
  trialTenant: { id: string; slug: string }
}

export function assertTestDb(): void {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL is not set — integration tests must not run.")
  }
  if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
    throw new Error(
      "Refusing to run: DATABASE_URL must equal TEST_DATABASE_URL for integration tests " +
        "(prevents touching a non-test database).",
    )
  }
  if (!process.env.APP_ENCRYPTION_KEY) {
    process.env.APP_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex")
  }
}

/** Remove only the rows this harness creates, in FK-safe order. */
export async function cleanup(): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    where: { slug: { in: ALL_SLUGS } },
    select: { id: true },
  })
  const ids = tenants.map((t) => t.id)
  if (ids.length > 0) {
    await prisma.voucher.deleteMany({ where: { tenant_id: { in: ids } } })
    await prisma.resellerProfile.deleteMany({ where: { tenant_id: { in: ids } } })
    await prisma.walletLog.deleteMany({ where: { tenant_id: { in: ids } } })
    await prisma.wallet.deleteMany({ where: { tenant_id: { in: ids } } })
    await prisma.profile.deleteMany({ where: { tenant_id: { in: ids } } })
    await prisma.subscriptionInvoice.deleteMany({ where: { tenant_id: { in: ids } } })
    await prisma.auditLog.deleteMany({ where: { tenant_id: { in: ids } } })
    await prisma.user.deleteMany({ where: { tenant_id: { in: ids } } })
    await prisma.tenant.deleteMany({ where: { id: { in: ids } } })
  }
  await prisma.user.deleteMany({ where: { email: SUPER_EMAIL } })
}

async function makeTenant(
  slug: string,
  superAdminId: string,
  opts: { isTrial?: boolean; trialEndAt?: Date | null; isActive?: boolean } = {},
) {
  return prisma.tenant.create({
    data: {
      name: `Tenant ${slug}`,
      slug,
      owner_name: `Owner ${slug}`,
      owner_email: `owner-${slug}@example.com`,
      owner_phone: "08123456789",
      mikrotik_host: "10.0.0.1",
      mikrotik_username: "admin",
      mikrotik_password_enc: encrypt("router-secret"),
      created_by: superAdminId,
      is_trial: opts.isTrial ?? false,
      is_active: opts.isActive ?? true,
      trial_end_at: opts.trialEndAt ?? null,
    },
  })
}

async function makeUser(
  email: string,
  role: "TENANT_ADMIN" | "RESELLER",
  tenantId: string,
) {
  return prisma.user.create({
    data: {
      email,
      name: email,
      password_hash: await bcrypt.hash("password123", 10),
      role,
      tenant_id: tenantId,
      is_active: true,
    },
  })
}

async function makeProfileAndVoucher(tenantId: string, resellerId: string) {
  const profile = await prisma.profile.create({
    data: {
      name: "1 Day",
      duration_days: 1,
      price: 5000,
      mikrotik_profile: "default",
      tenant_id: tenantId,
    },
  })
  const voucher = await prisma.voucher.create({
    data: {
      code: `V-${tenantId.slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`,
      price_charged: 5000,
      tenant_id: tenantId,
      user_id: resellerId,
      profile_id: profile.id,
      source: "reseller",
    },
  })
  return { profileId: profile.id, voucherId: voucher.id }
}

export async function seed(): Promise<SeedIds> {
  assertTestDb()
  await cleanup()

  const superAdmin = await prisma.user.create({
    data: {
      email: SUPER_EMAIL,
      name: "Test Super",
      password_hash: await bcrypt.hash("password123", 10),
      role: "SUPER_ADMIN",
      tenant_id: null,
      is_active: true,
    },
  })

  const tenantARow = await makeTenant(TENANT_A_SLUG, superAdmin.id)
  const tenantBRow = await makeTenant(TENANT_B_SLUG, superAdmin.id)
  const trialRow = await makeTenant(TRIAL_SLUG, superAdmin.id, {
    isTrial: true,
    isActive: true,
    trialEndAt: new Date(Date.now() - 86_400_000), // expired yesterday
  })

  const aAdmin = await makeUser(`admin-${TENANT_A_SLUG}@example.com`, "TENANT_ADMIN", tenantARow.id)
  const aReseller = await makeUser(`reseller-${TENANT_A_SLUG}@example.com`, "RESELLER", tenantARow.id)
  const bAdmin = await makeUser(`admin-${TENANT_B_SLUG}@example.com`, "TENANT_ADMIN", tenantBRow.id)
  const bReseller = await makeUser(`reseller-${TENANT_B_SLUG}@example.com`, "RESELLER", tenantBRow.id)

  const aPV = await makeProfileAndVoucher(tenantARow.id, aReseller.id)
  const bPV = await makeProfileAndVoucher(tenantBRow.id, bReseller.id)

  return {
    superAdminId: superAdmin.id,
    tenantA: { id: tenantARow.id, slug: TENANT_A_SLUG, adminId: aAdmin.id, resellerId: aReseller.id, ...aPV },
    tenantB: { id: tenantBRow.id, slug: TENANT_B_SLUG, adminId: bAdmin.id, resellerId: bReseller.id, ...bPV },
    trialTenant: { id: trialRow.id, slug: TRIAL_SLUG },
  }
}
