import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { encrypt } from "../src/lib/crypto"

const prisma = new PrismaClient()

const DEFAULT_TENANT_SLUG = "default"
const SUPER_ADMIN_EMAIL = "superadmin@root.vcr"

async function main() {
  console.log("Seeding multitenant defaults...\n")

  // ─────────────────────────────────────────────
  // Plans
  // ─────────────────────────────────────────────
  const planSpecs = [
    {
      name: "Trial",
      description: "Free trial 14 hari untuk customer baru",
      price: 0,
      duration_days: 14,
      is_trial: true,
      max_resellers: 2,
      max_vouchers_per_month: 100,
      features: [],
    },
    {
      name: "Basic",
      description: "Plan dasar untuk RT/RW Net kecil",
      price: 99000,
      duration_days: 30,
      is_trial: false,
      max_resellers: 3,
      max_vouchers_per_month: 1000,
      features: [],
    },
    {
      name: "Pro",
      description: "Plan menengah dengan branding & notifikasi WA",
      price: 199000,
      duration_days: 30,
      is_trial: false,
      max_resellers: 10,
      max_vouchers_per_month: 5000,
      features: ["branding", "whatsapp_notif"],
    },
    {
      name: "Enterprise",
      description: "Unlimited reseller, prioritas support, custom domain",
      price: 399000,
      duration_days: 30,
      is_trial: false,
      max_resellers: 999,
      max_vouchers_per_month: 999999,
      features: ["branding", "whatsapp_notif", "custom_domain", "priority_support"],
    },
  ]

  const plans: Record<string, string> = {}
  for (const spec of planSpecs) {
    const existing = await prisma.plan.findFirst({ where: { name: spec.name } })
    const plan = existing
      ? await prisma.plan.update({
          where: { id: existing.id },
          data: spec,
        })
      : await prisma.plan.create({ data: spec })
    plans[spec.name] = plan.id
    console.log(`  plan: ${plan.name} (${plan.id})`)
  }

  // ─────────────────────────────────────────────
  // Super Admin (no tenant)
  // ─────────────────────────────────────────────
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD
  if (!superAdminPassword) {
    throw new Error("SUPER_ADMIN_PASSWORD env var is required")
  }
  const superAdminHash = await bcrypt.hash(superAdminPassword, 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: { role: "SUPER_ADMIN", tenant_id: null, is_active: true },
    create: {
      email: SUPER_ADMIN_EMAIL,
      password_hash: superAdminHash,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      is_active: true,
      tenant_id: null,
    },
  })
  console.log(`\n  super admin: ${superAdmin.email} (${superAdmin.id})`)

  // ─────────────────────────────────────────────
  // Default Tenant (host for migrated single-tenant data)
  // ─────────────────────────────────────────────
  const oneYearFromNow = new Date()
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

  const mikrotikPasswordPlain = process.env.MIKROTIK_PASSWORD || "changeme"
  const mikrotikPasswordEnc = encrypt(mikrotikPasswordPlain)

  let tenant = await prisma.tenant.findUnique({ where: { slug: DEFAULT_TENANT_SLUG } })
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Tenant Awal",
        slug: DEFAULT_TENANT_SLUG,
        owner_name: "Fx",
        owner_email: "admin@root.vcr",
        owner_phone: "0822882231533",
        mikrotik_host: process.env.MIKROTIK_HOST || "localhost",
        mikrotik_port: Number(process.env.MIKROTIK_API_PORT || 8728),
        mikrotik_username: process.env.MIKROTIK_USER || "admin",
        mikrotik_password_enc: mikrotikPasswordEnc,
        mikrotik_use_ssl: false,
        plan_id: plans["Basic"],
        is_trial: false,
        subscription_start_at: new Date(),
        subscription_end_at: oneYearFromNow,
        is_active: true,
        max_resellers: 3,
        max_vouchers_per_month: 1000,
        created_by: superAdmin.id,
      },
    })
  }
  console.log(`  tenant: ${tenant.name} / slug=${tenant.slug} (${tenant.id})`)

  // ─────────────────────────────────────────────
  // Backfill tenantId on all existing data
  // ─────────────────────────────────────────────
  console.log("\n  backfilling tenant_id on existing rows:")
  const backfills: Array<[string, () => Promise<{ count: number }>]> = [
    ["users (non-super-admin)", () =>
      prisma.user.updateMany({
        where: {
          tenant_id: null,
          role: { not: "SUPER_ADMIN" },
        },
        data: { tenant_id: tenant!.id },
      }),
    ],
    ["profiles", () =>
      prisma.profile.updateMany({
        where: { tenant_id: null },
        data: { tenant_id: tenant!.id },
      }),
    ],
    ["vouchers", () =>
      prisma.voucher.updateMany({
        where: { tenant_id: null },
        data: { tenant_id: tenant!.id },
      }),
    ],
    ["wallets", () =>
      prisma.wallet.updateMany({
        where: { tenant_id: null },
        data: { tenant_id: tenant!.id },
      }),
    ],
    ["wallet_logs", () =>
      prisma.walletLog.updateMany({
        where: { tenant_id: null },
        data: { tenant_id: tenant!.id },
      }),
    ],
    ["reseller_profiles", () =>
      prisma.resellerProfile.updateMany({
        where: { tenant_id: null },
        data: { tenant_id: tenant!.id },
      }),
    ],
    ["settings", () =>
      prisma.setting.updateMany({
        where: { tenant_id: null },
        data: { tenant_id: tenant!.id },
      }),
    ],
    ["pppoe_users", () =>
      prisma.pppoeUser.updateMany({
        where: { tenant_id: null },
        data: { tenant_id: tenant!.id },
      }),
    ],
  ]

  for (const [label, fn] of backfills) {
    const result = await fn()
    console.log(`    ${label}: ${result.count} rows`)
  }

  // ─────────────────────────────────────────────
  // Bank Accounts (transfer destinations)
  // ─────────────────────────────────────────────
  const bankSpecs = [
    {
      bank_name: "BCA",
      account_number: "1234567890",
      account_holder: "Fx",
      notes: "Bank Central Asia",
      display_order: 1,
    },
    {
      bank_name: "Mandiri",
      account_number: "9876543210",
      account_holder: "Fx",
      notes: "Bank Mandiri",
      display_order: 2,
    },
    {
      bank_name: "Dana",
      account_number: "082288223153",
      account_holder: "Fx",
      notes: "E-wallet Dana",
      display_order: 3,
    },
  ]
  console.log("\n  bank accounts:")
  for (const spec of bankSpecs) {
    const existing = await prisma.bankAccount.findFirst({
      where: { bank_name: spec.bank_name, account_number: spec.account_number },
    })
    const account = existing
      ? await prisma.bankAccount.update({
          where: { id: existing.id },
          data: { ...spec, is_active: true },
        })
      : await prisma.bankAccount.create({ data: { ...spec, is_active: true } })
    console.log(`    ${account.bank_name} - ${account.account_number} (${account.id})`)
  }

  console.log("\nSeed selesai.")
  console.log(`\n  super admin login: ${SUPER_ADMIN_EMAIL} / (SUPER_ADMIN_PASSWORD env)`)
  console.log(`  tenant default slug: ${DEFAULT_TENANT_SLUG}`)
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
