import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // ─────────────────────────────────────────────
  // Settings (key-value defaults)
  // ─────────────────────────────────────────────
  const settings = [
    { key: "voucher_code_length", value: "8", type: "number" },
    { key: "voucher_code_format", value: "alphanumeric_upper", type: "string" },
    { key: "voucher_prefix", value: "VCR-", type: "string" },
    { key: "voucher_username_equals_password", value: "true", type: "boolean" },
    { key: "hotspot_login_url", value: "http://hotspot.local/login", type: "string" },
    { key: "company_name", value: "Root.VCR", type: "string" },
    { key: "company_logo_url", value: "/logo.png", type: "string" },
    { key: "mikrotik_host", value: "", type: "string" },
    { key: "mikrotik_port", value: "8728", type: "number" },
    { key: "mikrotik_user", value: "", type: "string" },
    { key: "mikrotik_password", value: "", type: "encrypted" },
  ]

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }
  console.log(`  ✓ ${settings.length} settings`)

  // ─────────────────────────────────────────────
  // Admin user
  // ─────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 12)
  const admin = await prisma.user.upsert({
    where: { email: "admin@root.vcr" },
    update: {},
    create: {
      email: "admin@root.vcr",
      password_hash: adminPassword,
      name: "Super Admin",
      role: "admin",
      phone: null,
      location: null,
      is_active: true,
      is_frozen: false,
      fee_percentage: 0,
    },
  })
  console.log(`  ✓ Admin: ${admin.email}`)

  // ─────────────────────────────────────────────
  // Sample voucher profiles (2 sesuai requirement)
  // ─────────────────────────────────────────────
  const profile1Hari = await prisma.profile.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Paket 1 Hari",
      duration_days: 1,
      duration_hours: 0,
      price: 3000,
      speed_limit: "5M/5M",
      mikrotik_profile: "1day-5mbps",
      is_active: true,
    },
  })

  const profile7Hari = await prisma.profile.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Paket 7 Hari",
      duration_days: 7,
      duration_hours: 0,
      price: 15000,
      speed_limit: "10M/10M",
      mikrotik_profile: "7day-10mbps",
      is_active: true,
    },
  })
  console.log(`  ✓ Profiles: "${profile1Hari.name}", "${profile7Hari.name}"`)

  // ─────────────────────────────────────────────
  // Sample reseller + wallet
  // ─────────────────────────────────────────────
  const resellerPassword = await bcrypt.hash("reseller123", 12)
  const reseller = await prisma.user.upsert({
    where: { email: "john@root.vcr" },
    update: {},
    create: {
      email: "john@root.vcr",
      password_hash: resellerPassword,
      name: "John Reseller",
      role: "reseller",
      phone: "081234567890",
      location: "Samarinda, Kalimantan Timur",
      is_active: true,
      is_frozen: false,
      fee_percentage: 10,
    },
  })

  // Wallet untuk reseller (upsert by user_id)
  const wallet = await prisma.wallet.upsert({
    where: { user_id: reseller.id },
    update: {},
    create: {
      user_id: reseller.id,
      balance: 500000,
      total_topup: 500000,
      total_spent: 0,
    },
  })

  // Catat wallet log untuk topup awal
  const existingLog = await prisma.walletLog.findFirst({
    where: { wallet_id: wallet.id, type: "topup" },
  })
  if (!existingLog) {
    await prisma.walletLog.create({
      data: {
        wallet_id: wallet.id,
        type: "topup",
        amount: 500000,
        balance_before: 0,
        balance_after: 500000,
        description: "Topup awal (seed data)",
        admin_id: admin.id,
      },
    })
  }

  // Assign kedua profile ke reseller
  for (const profileId of [profile1Hari.id, profile7Hari.id]) {
    await prisma.resellerProfile.upsert({
      where: {
        user_id_profile_id: { user_id: reseller.id, profile_id: profileId },
      },
      update: {},
      create: {
        user_id: reseller.id,
        profile_id: profileId,
        is_enabled: true,
      },
    })
  }

  console.log(`  ✓ Reseller: ${reseller.name} (${reseller.email}), fee ${reseller.fee_percentage}%`)
  console.log(`  ✓ Wallet: Rp ${wallet.balance.toString()} saldo awal`)

  console.log("\n✅ Seed selesai!")
  console.log("\nLogin credentials:")
  console.log(`  Admin    → email: admin@root.vcr  | password: admin123`)
  console.log(`  Reseller → email: john@root.vcr   | password: reseller123`)
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
