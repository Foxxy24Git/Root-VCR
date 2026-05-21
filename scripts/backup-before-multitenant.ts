import { prisma } from "@/lib/prisma"
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"

async function backupBeforeMultitenant() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupDir = join(process.cwd(), "backups", `pre-multitenant-${timestamp}`)
  mkdirSync(backupDir, { recursive: true })

  console.log(`Backup directory: ${backupDir}`)

  const tables: Record<string, unknown[]> = {
    users: await prisma.user.findMany(),
    profiles: await prisma.profile.findMany(),
    vouchers: await prisma.voucher.findMany(),
    wallets: await prisma.wallet.findMany(),
    wallet_logs: await prisma.walletLog.findMany(),
    reseller_profiles: await prisma.resellerProfile.findMany(),
    settings: await prisma.setting.findMany(),
    pppoe_users: await prisma.pppoeUser.findMany(),
  }

  for (const [name, rows] of Object.entries(tables)) {
    const filePath = join(backupDir, `${name}.json`)
    writeFileSync(filePath, JSON.stringify(rows, null, 2))
    console.log(`  ${name}: ${rows.length} rows -> ${filePath}`)
  }

  const manifest = {
    backupAt: new Date().toISOString(),
    schemaVersion: "pre-multitenant",
    counts: Object.fromEntries(
      Object.entries(tables).map(([k, v]) => [k, v.length])
    ),
  }
  writeFileSync(
    join(backupDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  )

  const total = Object.values(tables).reduce((sum, rows) => sum + rows.length, 0)
  console.log(`\nBackup completed. Total rows: ${total}`)
  console.log(`Manifest: ${join(backupDir, "manifest.json")}`)
}

backupBeforeMultitenant()
  .catch((err) => {
    console.error("Backup failed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
