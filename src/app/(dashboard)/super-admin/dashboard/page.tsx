import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { signOut } from "@/lib/auth"
import { Shield, Building2, Users, Ticket, LogOut } from "lucide-react"

export const metadata = {
  title: "Super Admin Dashboard — Root.VCR",
  robots: { index: false, follow: false },
}

async function handleSignOut() {
  "use server"
  await signOut({ redirectTo: "/super-admin/login" })
}

export default async function SuperAdminDashboardPage() {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  // Global counts (no tenant filter — Super Admin sees everything)
  const [tenantCount, activeTenants, totalUsers, totalVouchers] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { is_active: true } }),
    prisma.user.count(),
    prisma.voucher.count(),
  ])

  const stats = [
    {
      label: "Total Tenant",
      value: tenantCount,
      sub: `${activeTenants} aktif`,
      icon: Building2,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/30",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Total User",
      value: totalUsers,
      sub: "semua tenant",
      icon: Users,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Total Voucher",
      value: totalVouchers,
      sub: "semua tenant",
      icon: Ticket,
      iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Super Admin Console
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Selamat datang, Super Admin 👋
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Halaman ini sementara — Phase 4 (Tenant Management UI) akan menggantikan tampilan ini.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
            >
              <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {s.label}
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {s.value.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Roadmap note */}
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-6">
          <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
            Phase 4 — Tenant Management
          </h3>
          <ul className="text-sm text-indigo-700 dark:text-indigo-300 space-y-1 list-disc list-inside">
            <li>List tenant + filter status/plan</li>
            <li>Detail tenant + edit MikroTik config override</li>
            <li>Plan management (CRUD)</li>
            <li>Invoice & verifikasi bukti transfer</li>
            <li>Audit log viewer</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
