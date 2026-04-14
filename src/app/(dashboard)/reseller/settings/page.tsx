import { getSessionUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ChangePasswordForm } from "./ChangePasswordForm"
import { ResellerProfileForm } from "./ResellerProfileForm"
import { Lock } from "lucide-react"

export const metadata = {
  title: "Settings — Root.VCR",
}

export default async function SettingsPage() {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "reseller") {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true, phone: true, location: true, avatar_url: true },
  })

  if (!user) redirect("/login")

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Kelola profil dan keamanan akun Anda.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900">Informasi Profil</h2>
          </div>
          <div className="p-6">
            <ResellerProfileForm user={user} />
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <Lock className="text-blue-600 w-5 h-5" />
            <h2 className="text-lg font-bold text-slate-900">Keamanan (Ubah Password)</h2>
          </div>
          <div className="p-6">
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  )
}
