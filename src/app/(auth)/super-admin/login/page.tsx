import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Shield } from "lucide-react"
import { SuperAdminLoginForm } from "./super-admin-login-form"

export const metadata = {
  title: "Super Admin Login — Root.VCR",
  robots: { index: false, follow: false },
}

export default async function SuperAdminLoginPage() {
  const session = await auth()

  // If already logged in:
  // - SUPER_ADMIN → dashboard
  // - Other roles → main login (mereka tidak boleh ke area super admin)
  if (session?.user) {
    if (session.user.role === "SUPER_ADMIN") {
      redirect("/super-admin/dashboard")
    }
    redirect("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-3 shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Super Admin
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
              Login khusus owner aplikasi Root.VCR
            </p>
          </div>

          <SuperAdminLoginForm />

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Bukan Super Admin?{" "}
              <a href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Login sebagai Tenant
              </a>
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4">
          © {new Date().getFullYear()} Root.VCR — Super Admin Area
        </p>
      </div>
    </div>
  )
}
