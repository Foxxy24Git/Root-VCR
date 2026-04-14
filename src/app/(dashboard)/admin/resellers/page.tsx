import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ResellerManagement } from "./ResellerManagement"
import { Users, UserCheck, Snowflake, TrendingUp } from "lucide-react"
import Link from "next/link"

export interface ProfileOption {
  id: string
  name: string
  price: number
}

export const metadata = {
  title: "Reseller Management — Root.VCR",
}

export default async function AdminResellersPage() {
  const { user, error } = await requireAdmin()
  if (error || !user) redirect("/login")

  const [users, allProfiles] = await Promise.all([
    prisma.user.findMany({
      where: { role: "reseller" },
      orderBy: { created_at: "desc" },
      select: {
        id: true, name: true, email: true, phone: true, avatar_url: true,
        fee_percentage: true, is_active: true, is_frozen: true, created_at: true,
        wallet: { select: { balance: true, total_spent: true } },
      },
    }),
    prisma.profile.findMany({
      where: { is_active: true },
      orderBy: { price: "asc" },
      select: { id: true, name: true, price: true },
    }),
  ])

  const resellers = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    fee_percentage: Number(u.fee_percentage),
    is_active: u.is_active,
    is_frozen: u.is_frozen,
    created_at: u.created_at.toISOString(),
    balance: Number(u.wallet?.balance ?? 0),
    total_spent: Number(u.wallet?.total_spent ?? 0),
    avatar_url: u.avatar_url ?? null,
  }))

  const totalActive = resellers.filter(r => !r.is_frozen && r.is_active).length
  const totalFrozen = resellers.filter(r => r.is_frozen).length
  const totalOmset = resellers.reduce((sum, r) => sum + r.total_spent, 0)

  const profileOptions: ProfileOption[] = allProfiles.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 md:pb-0 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Manajemen Reseller</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola akun reseller, saldo, dan status akun.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{resellers.length}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Reseller terdaftar</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aktif</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{totalActive}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Reseller aktif</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Snowflake className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Frozen</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{totalFrozen}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Akun dibekukan</p>
        </div>
        <Link href="/admin/revenue" className="block hover:-translate-y-0.5 transition-transform">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Omset</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(totalOmset)}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Total omset semua reseller</p>
          </div>
        </Link>
      </div>

      <ResellerManagement resellers={resellers} profiles={profileOptions} />
    </div>
  )
}
