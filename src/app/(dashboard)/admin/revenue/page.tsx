import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { RevenueClient } from "./RevenueClient"
import { Suspense } from "react"

export const metadata = {
  title: "Revenue — Root.VCR Admin",
}

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function AdminRevenuePage({ searchParams }: PageProps) {
  const { user, error } = await requireAdmin()
  if (error || !user) redirect("/login")

  const params = await searchParams
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const month = params.month ?? defaultMonth

  const [year, mon] = month.split("-").map(Number)
  const startOfMonth = new Date(year, mon - 1, 1, 0, 0, 0, 0)
  const endOfMonth = new Date(year, mon, 0, 23, 59, 59, 999)

  const vouchers = await prisma.voucher.findMany({
    where: { generated_at: { gte: startOfMonth, lte: endOfMonth } },
    select: { generated_at: true, price_charged: true },
  })

  // Build per-day data for the selected month
  const daysInMonth = new Date(year, mon, 0).getDate()
  const data = Array.from({ length: daysInMonth }).map((_, i) => {
    const dayNum = i + 1
    const dayStart = new Date(year, mon - 1, dayNum, 0, 0, 0, 0)
    const dayEnd = new Date(year, mon - 1, dayNum, 23, 59, 59, 999)
    const dayVouchers = vouchers.filter(
      (v) => v.generated_at >= dayStart && v.generated_at <= dayEnd
    )
    return {
      date: `${year}-${String(mon).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`,
      dateLabel: `${dayNum} ${startOfMonth.toLocaleString("id-ID", { month: "short" })}`,
      count: dayVouchers.length,
      revenue: dayVouchers.reduce((sum, v) => sum + Number(v.price_charged), 0),
    }
  })

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const totalVouchers = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Revenue</h1>
        <p className="text-slate-500 mt-1">Ringkasan revenue bulanan dari penjualan voucher.</p>
      </div>
      <Suspense>
        <RevenueClient
          data={data}
          month={month}
          totalRevenue={totalRevenue}
          totalVouchers={totalVouchers}
        />
      </Suspense>
    </div>
  )
}
