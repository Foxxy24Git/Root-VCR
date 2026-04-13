import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { StatsCard } from "@/components/cards/StatsCard"
import { Users, Ticket, WalletIcon, Activity, ArrowUpRight } from "lucide-react"
import { AdminRevenueChart } from "./AdminRevenueChart"
import Link from "next/link"

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

  // Top Level Metrics
  const [
    vouchersToday, 
    totalResellerSaldo, 
    revenueMTD, 
    activeResellers,
    recentWallets
  ] = await Promise.all([
    // Vouchers Today
    prisma.voucher.count({ where: { generated_at: { gte: today } } }),
    // Total Reseller Saldo
    prisma.wallet.aggregate({ _sum: { balance: true } }),
    // Revenue MTD (from total_spent of all wallets or sum of voucher prices)
    prisma.voucher.aggregate({ 
      where: { generated_at: { gte: startOfMonth } },
      _sum: { price_charged: true } 
    }),
    // Active Resellers
    prisma.user.count({ where: { role: "reseller", is_active: true, is_frozen: false } }),
    // Recent Activities (latest wallet logs)
    prisma.walletLog.findMany({
      take: 5,
      orderBy: { created_at: "desc" },
      include: {
        wallet: { include: { user: { select: { name: true } } } }
      }
    })
  ])

  // Process Revenue Trend (Last 7 Days)
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
    where: { generated_at: { gte: sevenDaysAgo } },
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

  // Top Resellers Leaderboard
  const topResellers = await prisma.wallet.findMany({
    take: 5,
    orderBy: { total_spent: "desc" },
    include: { user: { select: { name: true, email: true, avatar_url: true } } }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Ringkasan sistem dan performa keseluruhan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Voucher (Hari Ini)"
          value={vouchersToday.toLocaleString("id-ID")}
          icon={Ticket}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatsCard
          title="Total Saldo Reseller"
          value={`Rp ${(totalResellerSaldo._sum.balance || 0).toLocaleString("id-ID")}`}
          icon={WalletIcon}
          iconClassName="bg-indigo-50 text-indigo-600"
        />
        <StatsCard
          title="Revenue (Bulan Ini)"
          value={`Rp ${(revenueMTD._sum.price_charged || 0).toLocaleString("id-ID")}`}
          icon={Activity}
          iconClassName="bg-green-50 text-green-600"
        />
        <StatsCard
          title="Reseller Aktif"
          value={activeResellers.toLocaleString("id-ID")}
          icon={Users}
          iconClassName="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AdminRevenueChart data={trendData} />
        </div>

        <div className="space-y-6">
          {/* Top Resellers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900">Top Resellers</h3>
              <Link href="/admin/resellers" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Details <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {topResellers.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Belum ada reseller.</p>
              ) : (
                topResellers.map((wallet) => (
                  <div key={wallet.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shrink-0">
                      {wallet.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{wallet.user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{wallet.user.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">Rp {Number(wallet.total_spent).toLocaleString("id-ID")}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Omset</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900">Aktivitas Wallet Terkini</h3>
            </div>
            <div className="space-y-4">
              {recentWallets.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Belum ada aktivitas.</p>
              ) : (
                recentWallets.map(log => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.type === 'deduct' ? 'bg-red-500' : 'bg-green-500'}`} />
                    <div>
                      <p className="text-sm text-slate-900">
                        <span className="font-medium text-slate-700">{log.wallet.user.name}</span>
                        {" "}{log.type === 'deduct' ? 'generate voucher' : 'menerima topup'} sejumlah{" "}
                        <span className="font-bold">Rp {Number(log.amount).toLocaleString("id-ID")}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {log.created_at.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
