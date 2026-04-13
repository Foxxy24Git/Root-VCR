import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AdminSettingsForm } from "./AdminSettingsForm"

export const metadata = {
  title: "Settings — Root.VCR Admin",
}

export default async function AdminSettingsPage() {
  const { user, error } = await requireAdmin()
  if (error || !user) redirect("/login")

  const [adminUser, settingsRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, phone: true, location: true },
    }),
    prisma.setting.findMany(),
  ])

  if (!adminUser) redirect("/login")

  const settings: Record<string, string | null> = {}
  settingsRows.forEach(r => { settings[r.key] = r.value })

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Konfigurasi sistem, MikroTik, hotspot, dan keamanan.</p>
      </div>

      <AdminSettingsForm
        adminUser={{
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone,
          location: adminUser.location,
        }}
        settings={settings as Record<string, string>}
      />
    </div>
  )
}
