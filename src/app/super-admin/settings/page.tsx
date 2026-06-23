import { redirect } from "next/navigation"
import { Settings as SettingsIcon } from "lucide-react"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { SettingsForm } from "./SettingsForm"

export const metadata = {
  title: "Settings — Super Admin",
  robots: { index: false, follow: false },
}

export default async function SuperAdminSettingsPage() {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  const adminUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      location: true,
      avatar_url: true,
    },
  })

  if (!adminUser) redirect("/super-admin/login")

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up pb-10">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Pengaturan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Kelola profil dan keamanan akun Super Admin Anda.
          </p>
        </div>
      </div>

      <SettingsForm initialUser={adminUser} />
    </div>
  )
}
