"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AreaChart, Area, CartesianGrid, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface DayRevenue {
  date: string
  dateLabel: string
  count: number
  revenue: number
}

interface RevenueClientProps {
  data: DayRevenue[]
  month: string   // "YYYY-MM"
  totalRevenue: number
  totalVouchers: number
}

const idrFmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v)

function useDark() {
  const [dark, setDark] = React.useState(false)
  React.useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])
  return dark
}

export function RevenueClient({ data, month, totalRevenue, totalVouchers }: RevenueClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDark = useDark()

  const grid = isDark ? "#334155" : "#f1f5f9"
  const tick = isDark ? "#94a3b8" : "#64748b"
  const ttStyle = {
    borderRadius: "12px",
    border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
    background: isDark ? "#1e293b" : "#ffffff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  }

  function handleMonthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", e.target.value)
    router.push(`/admin/revenue?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pilih Bulan:</label>
        <input
          type="month"
          value={month}
          onChange={handleMonthChange}
          className="border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 transition-colors duration-200">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{idrFmt(totalRevenue)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 transition-colors duration-200">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Voucher</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalVouchers.toLocaleString("id-ID")}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors duration-200">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-6">Revenue Harian</h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
              <XAxis
                dataKey="dateLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: tick }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: tick }}
                tickFormatter={(v) => `Rp ${(v / 1000).toFixed(0)}k`}
                width={72}
              />
              <RechartsTooltip
                contentStyle={ttStyle}
                formatter={(value: unknown) => [idrFmt(Number(value)), "Revenue"]}
                labelStyle={{ color: tick, marginBottom: "4px" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Detail Per Hari</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Voucher</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-slate-500 dark:text-slate-400 italic py-8">
                  Tidak ada data untuk bulan ini.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="font-medium text-slate-700 dark:text-slate-300">{row.dateLabel}</TableCell>
                  <TableCell className="text-right">{row.count.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right font-semibold">{idrFmt(row.revenue)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
