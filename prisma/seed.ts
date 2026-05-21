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
    { key: "voucher_prefix", value: "", type: "string" },
    { key: "voucher_username_equals_password", value: "true", type: "boolean" },
    { key: "hotspot_login_url", value: "", type: "string" },
    { key: "company_name", value: "Root.VCR", type: "string" },
    { key: "company_logo_url", value: "", type: "string" },
    { key: "mikrotik_host", value: "", type: "string" },
    { key: "mikrotik_port", value: "8728", type: "number" },
    { key: "mikrotik_user", value: "", type: "string" },
    { key: "mikrotik_password", value: "", type: "encrypted" },
    { key: "whatsapp_number", value: "0822882231533", type: "string" },
    { key: "whatsapp_topup_message", value: "Halo Admin, saya mau topup saldo Rp {amount} untuk akun {email}", type: "string" },
    { key: "whatsapp_withdraw_message", value: "Halo Admin, saya mau withdraw saldo Rp {amount} untuk akun {email}", type: "string" },
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
  // Admin user only (no dummy resellers)
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

  console.log("\n✅ Seed selesai!")
  console.log("\nLogin credentials:")
  console.log(`  Admin → email: admin@root.vcr | password: admin123`)
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
