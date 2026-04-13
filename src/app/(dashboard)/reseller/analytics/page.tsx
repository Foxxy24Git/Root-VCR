import { getSessionUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AnalyticsCharts } from "./AnalyticsCharts"

export const metadata = {
  title: "Analytics — Root.VCR",
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  const user = await getSessionUser()
  if (!user || user.role !== "reseller") {
    redirect("/login")
  }

  const period = searchParams.period === "today" || searchParams.period === "month"
    ? searchParams.period
    : "week"

  // Compute date range based on period
  const now = new Date()
  let startDate: Date

  if (period === "today") {
    startDate = new Date(now)
    startDate.setHours(0, 0, 0, 0)
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    startDate.setHours(0, 0, 0, 0)
  } else {
    // week - default
    startDate = new Date(now)
    startDate.setDate(now.getDate() - 6)
    startDate.setHours(0, 0, 0, 0)
  }

  // Wallet data
  const wallet = await prisma.wallet.findUnique({
    where: { user_id: user.id },
  })

  const walletData = {
    spent: Number(wallet?.total_spent ?? 0),
    remaining: Number(wallet?.balance ?? 0),
  }

  // Vouchers in selected period
  const vouchersInPeriod = await prisma.voucher.findMany({
    where: {
      user_id: user.id,
      generated_at: { gte: startDate },
    },
    select: {
      generated_at: true,
      price_charged: true,
      profile: { select: { name: true } },
    },
  })

  // Build date buckets for trend chart
  let buckets: { dateObj: Date; label: string }[] = []

  if (period === "today") {
    // Hourly buckets (0-23)
    buckets = Array.from({ length: 24 }).map((_, i) => {
      const d = new Date(now)
      d.setHours(i, 0, 0, 0)
      return {
        dateObj: d,
        label: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      }
    })
  } else if (period === "month") {
    // Daily buckets for current month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    buckets = Array.from({ length: daysInMonth }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1)
      return {
        dateObj: d,
        label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      }
    })
  } else {
    // Daily buckets for last 7 days
    buckets = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() - (6 - i))
      d.setHours(0, 0, 0, 0)
      return {
        dateObj: d,
        label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      }
    })
  }

  // Group vouchers into buckets
  const trendData = buckets.map((bucket, i) => {
    const bucketStart = new Date(bucket.dateObj)
    const bucketEnd = new Date(bucket.dateObj)

    if (period === "today") {
      bucketEnd.setHours(bucket.dateObj.getHours(), 59, 59, 999)
    } else if (i < buckets.length - 1) {
      bucketEnd.setTime(buckets[i + 1].dateObj.getTime() - 1)
    } else {
      bucketEnd.setHours(23, 59, 59, 999)
    }

    const count = vouchersInPeriod.filter(
      (v) => v.generated_at >= bucketStart && v.generated_at <= bucketEnd
    ).length

    return { date: bucket.label, count }
  })

  // Profile popularity
  const profileCounts: Record<string, number> = {}
  vouchersInPeriod.forEach((v) => {
    const name = v.profile?.name ?? "Unknown"
    profileCounts[name] = (profileCounts[name] || 0) + 1
  })

  const popularProfileData = Object.entries(profileCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // Summary stats
  const totalVouchers = vouchersInPeriod.length
  const totalRevenue = vouchersInPeriod.reduce(
    (sum, v) => sum + Number(v.price_charged),
    0
  )
  const activeDays =
    period === "today" ? 1 : period === "month" ? buckets.length : 7
  const avgPerDay = activeDays > 0 ? Math.round(totalVouchers / activeDays) : 0
  const topProfile = popularProfileData[0]?.name ?? "-"

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">Pantau statistik penjualan dan penggunaan saldo Anda.</p>
      </div>

      <AnalyticsCharts
        period={period}
        trendData={trendData}
        profileData={popularProfileData}
        walletData={walletData}
        stats={{
          totalVouchers,
          totalRevenue,
          avgPerDay,
          topProfile,
        }}
      />
    </div>
  )
}
