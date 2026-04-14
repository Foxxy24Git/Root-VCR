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

export function RevenueClient({ data, month, totalRevenue, totalVouchers }: RevenueClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleMonthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", e.target.value)
    router.push(`/admin/revenue?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-slate-700">Pilih Bulan:</label>
        <input
          type="month"
          value={month}
          onChange={handleMonthChange}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{idrFmt(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Voucher</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalVouchers.toLocaleString("id-ID")}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-6">Revenue Harian</h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="dateLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(v) => `Rp ${(v / 1000).toFixed(0)}k`}
                width={72}
              />
              <RechartsTooltip
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                formatter={(value: unknown) => [idrFmt(Number(value)), "Revenue"]}
                labelStyle={{ color: "#64748b", marginBottom: "4px" }}
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
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Detail Per Hari</h3>
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
                <TableCell colSpan={3} className="text-center text-slate-500 italic py-8">
                  Tidak ada data untuk bulan ini.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="font-medium text-slate-700">{row.dateLabel}</TableCell>
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
