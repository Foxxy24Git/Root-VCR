import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AdminAnalyticsCharts } from "./AdminAnalyticsCharts"
import { Ticket, TrendingUp, Users, DollarSign } from "lucide-react"

export const metadata = {
  title: "Analytics — Root.VCR Admin",
}

export default async function AdminAnalyticsPage() {
  const { user, error } = await requireAdmin()
  if (error || !user) redirect("/login")

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  // Build last 7 days array
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      dateObj: d,
      dateString: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
    }
  })

  const sevenDaysAgo = new Date(last7Days[0].dateObj)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const [
    vouchersToday,
    revenueMTD,
    activeResellers,
    totalResellers,
    vouchersLast7Days,
    topResellers,
    profileCounts,
  ] = await Promise.all([
    prisma.voucher.count({ where: { generated_at: { gte: today } } }),
    prisma.voucher.aggregate({
      where: { generated_at: { gte: startOfMonth }, source: "reseller" },
      _sum: { price_charged: true },
    }),
    prisma.user.count({ where: { role: "reseller", is_active: true, is_frozen: false } }),
    prisma.user.count({ where: { role: "reseller" } }),
    prisma.voucher.findMany({
      where: { generated_at: { gte: sevenDaysAgo }, source: "reseller" },
      select: { generated_at: true, price_charged: true, profile: { select: { name: true } } },
    }),
    prisma.wallet.findMany({
      take: 8,
      orderBy: { total_spent: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.voucher.groupBy({
      by: ["profile_id"],
      where: { generated_at: { gte: sevenDaysAgo } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    }),
  ])

  // Fetch profile names for profileCounts
  const profileIds = profileCounts.map(p => p.profile_id).filter(Boolean) as string[]
  const profileNames = await prisma.profile.findMany({
    where: { id: { in: profileIds } },
    select: { id: true, name: true },
  })
  const profileNameMap = Object.fromEntries(profileNames.map(p => [p.id, p.name]))

  // Build revenue trend data
  const revenueData = last7Days.map(day => {
    const start = new Date(day.dateObj)
    start.setHours(0, 0, 0, 0)
    const end = new Date(day.dateObj)
    end.setHours(23, 59, 59, 999)

    const dayVouchers = vouchersLast7Days.filter(
      v => v.generated_at >= start && v.generated_at <= end
    )
    return {
      date: day.dateString,
      count: dayVouchers.length,
      revenue: dayVouchers.reduce((sum, v) => sum + Number(v.price_charged), 0),
    }
  })

  const resellerData = topResellers.map(w => ({
    name: w.user.name.length > 10 ? w.user.name.slice(0, 10) + "…" : w.user.name,
    omset: Number(w.total_spent),
    vouchers: 0,
  }))

  const profileData = profileCounts.map(p => ({
    name: p.profile_id ? (profileNameMap[p.profile_id] ?? "Unknown") : "Unknown",
    value: p._count.id,
  }))

  const totalRevenue7Days = revenueData.reduce((s, d) => s + d.revenue, 0)
  const totalVouchers7Days = revenueData.reduce((s, d) => s + d.count, 0)

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Analytics</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Performa sistem secara keseluruhan.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Voucher Hari Ini",
            value: vouchersToday.toLocaleString("id-ID"),
            sub: "voucher digenerate",
            icon: <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
            bg: "bg-blue-50 dark:bg-blue-900/30",
          },
          {
            label: "Revenue (Bulan Ini)",
            value: `Rp ${(Number(revenueMTD._sum.price_charged) || 0).toLocaleString("id-ID")}`,
            sub: "total bulan ini",
            icon: <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />,
            bg: "bg-green-50 dark:bg-green-900/30",
          },
          {
            label: "Reseller Aktif",
            value: activeResellers.toLocaleString("id-ID"),
            sub: `dari ${totalResellers} total`,
            icon: <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
            bg: "bg-indigo-50 dark:bg-indigo-900/30",
          },
          {
            label: "Revenue (7 Hari)",
            value: `Rp ${totalRevenue7Days.toLocaleString("id-ID")}`,
            sub: `${totalVouchers7Days} voucher`,
            icon: <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
            bg: "bg-amber-50 dark:bg-amber-900/30",
          },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 hover:-translate-y-0.5 hover:shadow-md transition-all">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
              {stat.icon}
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stat.value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      <AdminAnalyticsCharts
        revenueData={revenueData}
        resellerData={resellerData}
        profileData={profileData}
        totalRevenue={totalRevenue7Days}
        totalVouchers={totalVouchers7Days}
      />
    </div>
  )
}
