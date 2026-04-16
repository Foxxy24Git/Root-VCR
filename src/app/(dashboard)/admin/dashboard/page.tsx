import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { StatsCard } from "@/components/cards/StatsCard"
import { Users, Ticket, WalletIcon, Activity, ArrowUpRight } from "lucide-react"
import { AdminRevenueChart } from "./AdminRevenueChart"
import Link from "next/link"
import { EmptyState } from "@/components/shared/EmptyState"
import { AdminPrintVoucherForm } from "./AdminPrintVoucherForm"

export const metadata = {
  title: "Admin Dashboard — Root.VCR",
}

export default async function AdminDashboardPage() {
  const { user, error } = await requireAdmin()
  if (error || !user) redirect("/login")

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [
    vouchersToday,
    totalResellerSaldo,
    revenueMTD,
    activeResellers,
    recentWallets,
    activeProfiles
  ] = await Promise.all([
    prisma.voucher.count({ where: { generated_at: { gte: today } } }),
    prisma.wallet.aggregate({ _sum: { balance: true } }),
    prisma.voucher.aggregate({
      where: { generated_at: { gte: startOfMonth }, source: "reseller" },
      _sum: { price_charged: true }
    }),
    prisma.user.count({ where: { role: "reseller", is_active: true, is_frozen: false } }),
    prisma.walletLog.findMany({
      take: 5,
      orderBy: { created_at: "desc" },
      include: {
        wallet: { include: { user: { select: { name: true } } } }
      }
    }),
    prisma.profile.findMany({
      where: { is_active: true },
      orderBy: { price: "asc" },
      select: { id: true, name: true, duration_days: true, duration_hours: true },
    })
  ])

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      dateObj: d,
      dateString: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
    }
  })

  const sevenDaysAgo = last7Days[0].dateObj
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const vouchersLast7Days = await prisma.voucher.findMany({
    where: { generated_at: { gte: sevenDaysAgo }, source: "reseller" },
    select: { generated_at: true, price_charged: true }
  })

  const trendData = last7Days.map(day => {
    const startOfDay = new Date(day.dateObj)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(day.dateObj)
    endOfDay.setHours(23, 59, 59, 999)
    const dayVouchers = vouchersLast7Days.filter(v =>
      v.generated_at >= startOfDay && v.generated_at <= endOfDay
    )
    return {
      date: day.dateString,
      count: dayVouchers.length,
      revenue: dayVouchers.reduce((sum, v) => sum + Number(v.price_charged), 0)
    }
  })

  const topResellers = await prisma.wallet.findMany({
    take: 5,
    orderBy: { total_spent: "desc" },
    include: { user: { select: { name: true, email: true, avatar_url: true } } }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-0 animate-slide-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">Ringkasan sistem dan performa keseluruhan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <Link href="/voucher/semua" className="block animate-slide-up hover:scale-[1.02] transition-transform">
          <StatsCard
            title="Voucher (Hari Ini)"
            value={vouchersToday.toLocaleString("id-ID")}
            icon={Ticket}
            iconClassName="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            className="cursor-pointer"
          />
        </Link>
        <Link href="/admin/wallet" className="block animate-slide-up">
          <StatsCard
            title="Total Saldo Reseller"
            value={new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(totalResellerSaldo._sum.balance || 0))}
            icon={WalletIcon}
            iconClassName="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
            className="cursor-pointer"
          />
        </Link>
        <Link href="/admin/revenue" className="block animate-slide-up">
          <StatsCard
            title="Revenue (Bulan Ini)"
            value={new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(revenueMTD._sum.price_charged || 0))}
            icon={Activity}
            iconClassName="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            className="cursor-pointer"
          />
        </Link>
        <Link href="/admin/resellers" className="block animate-slide-up">
          <StatsCard
            title="Reseller Aktif"
            value={activeResellers.toLocaleString("id-ID")}
            icon={Users}
            iconClassName="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            className="cursor-pointer"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom kiri: chart + cetak voucher stacked langsung */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <AdminRevenueChart data={trendData} />

          {/* Cetak Voucher — Admin Only */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Cetak Voucher</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Generate voucher tanpa potong saldo — tidak masuk laporan keuangan.
            </p>
            <div className="max-w-md mx-auto">
              <AdminPrintVoucherForm profiles={activeProfiles} />
            </div>
          </div>
        </div>

        {/* Kolom kanan: sidebar */}
        <div className="space-y-6">
          {/* Top Resellers */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Top Resellers</h3>
              <Link href="/admin/resellers" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium flex items-center gap-1">
                Details <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            {topResellers.length === 0 ? (
              <EmptyState icon={Users} title="Belum ada reseller" className="py-8" />
            ) : (
              <div className="space-y-4">
                {topResellers.map((wallet) => (
                  <div key={wallet.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shrink-0">
                      {wallet.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{wallet.user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{wallet.user.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Rp {Number(wallet.total_spent).toLocaleString("id-ID")}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Omset</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Aktivitas Wallet Terkini</h3>
            </div>
            {recentWallets.length === 0 ? (
              <EmptyState icon={Activity} title="Belum ada aktivitas" className="py-8" />
            ) : (
              <div className="space-y-4">
                {recentWallets.map(log => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.type === 'deduct' ? 'bg-red-500' : 'bg-green-500'}`} />
                    <div>
                      <p className="text-sm text-slate-900 dark:text-slate-300">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{log.wallet.user.name}</span>
                        {" "}{log.type === 'deduct' ? 'generate voucher' : 'menerima topup'} sejumlah{" "}
                        <span className="font-bold">Rp {Number(log.amount).toLocaleString("id-ID")}</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {log.created_at.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
