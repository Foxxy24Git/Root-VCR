import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { decrypt } from "@/lib/crypto"
import { AdminSettingsForm } from "./AdminSettingsForm"

export const metadata = {
  title: "Settings — Root.VCR Admin",
}

export default async function AdminSettingsPage() {
  const { user, error } = await requireAdmin()
  if (error || !user) redirect("/login")

  const tenantId = user.tenantId!

  const [adminUser, settingsRows, tenant] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, phone: true, location: true, avatar_url: true },
    }),
    prisma.setting.findMany({
      where: { tenant_id: tenantId },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        mikrotik_host: true,
        mikrotik_port: true,
        mikrotik_username: true,
        mikrotik_password_enc: true,
      },
    }),
  ])

  if (!adminUser) redirect("/login")

  const settings: Record<string, string | null> = {}
  settingsRows.forEach(r => { settings[r.key] = r.value })

  if (tenant) {
    settings.mikrotik_host = tenant.mikrotik_host || ""
    settings.mikrotik_api_port = String(tenant.mikrotik_port || 8728)
    settings.mikrotik_user = tenant.mikrotik_username || ""
    settings.mikrotik_pass = tenant.mikrotik_password_enc ? decrypt(tenant.mikrotik_password_enc) : ""
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Konfigurasi sistem, MikroTik, hotspot, dan keamanan.</p>
      </div>

      <AdminSettingsForm
        adminUser={{
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone,
          location: adminUser.location,
          avatar_url: adminUser.avatar_url,
        }}
        settings={settings as Record<string, string>}
      />
    </div>
  )
}
