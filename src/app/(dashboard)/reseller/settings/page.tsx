import { getSessionUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ChangePasswordForm } from "./ChangePasswordForm"
import { LogOut, User, Lock, Mail, Phone, MapPin } from "lucide-react"

export const metadata = {
  title: "Settings — Root.VCR",
}

export default async function SettingsPage() {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "reseller") {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id }
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
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <User className="text-blue-600 w-5 h-5" />
            <h2 className="text-lg font-bold text-slate-900">Informasi Profil</h2>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-8 items-start">
              
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>

              <div className="flex-1 space-y-6 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Nama Lengkap
                    </label>
                    <div className="flex items-center gap-2 text-slate-900 font-medium bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100">
                      <User className="w-4 h-4 text-slate-400" />
                      {user.name}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Email Address
                    </label>
                    <div className="flex items-center gap-2 text-slate-900 font-medium bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {user.email}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      No. Telepon
                    </label>
                    <div className="flex items-center gap-2 text-slate-900 font-medium bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {user.phone || "-"}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Lokasi / Alamat
                    </label>
                    <div className="flex items-center gap-2 text-slate-900 font-medium bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {user.location || "-"}
                    </div>
                  </div>

                </div>

                <p className="text-xs text-slate-500">
                  Untuk mengubah informasi profil (Nama, Email, dsb), silakan hubungi Admin.
                </p>
              </div>
            </div>
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

        {/* Danger Zone */}
        <div className="pt-4">
          <form action="/api/auth/signout" method="POST">
            <button 
              type="submit"
              className="flex items-center justify-center gap-2 w-full md:w-auto bg-white border-2 border-red-100 hover:bg-red-50 text-red-600 px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar (Logout)
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
