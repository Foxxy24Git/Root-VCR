"use client"

import * as React from "react"
import Link from "next/link"
import {
  Area, AreaChart, CartesianGrid, Tooltip as RechartsTooltip,
  XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from "recharts"
import { Ticket, TrendingUp, BarChart2, Star } from "lucide-react"

interface TrendData { date: string; count: number }
interface ProfileData { name: string; count: number }

interface AnalyticsChartsProps {
  period: string
  trendData: TrendData[]
  profileData: ProfileData[]
  walletData: { spent: number; remaining: number }
  stats: { totalVouchers: number; totalRevenue: number; avgPerDay: number; topProfile: string }
}

const PIE_COLORS_LIGHT = ["#3b82f6", "#e2e8f0"]
const PIE_COLORS_DARK  = ["#3b82f6", "#334155"]
const BAR_COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#22c55e"]
const PERIOD_LABELS: Record<string, string> = { today: "Hari Ini", week: "7 Hari", month: "Bulan Ini" }

export function AnalyticsCharts({ period, trendData, profileData, walletData, stats }: AnalyticsChartsProps) {
  const [isDark, setIsDark] = React.useState(false)

  React.useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  const grid    = isDark ? "#334155" : "#f1f5f9"
  const tick    = isDark ? "#94a3b8" : "#64748b"
  const ttBg    = isDark ? "#1e293b" : "#ffffff"
  const ttBorder= isDark ? "#334155" : "#f1f5f9"
  const ttText  = isDark ? "#e2e8f0" : "#0f172a"
  const pieColors = isDark ? PIE_COLORS_DARK : PIE_COLORS_LIGHT

  const pieData = [
    { name: "Terpakai", value: walletData.spent },
    { name: "Sisa",     value: walletData.remaining },
  ]

  const summaryCards = [
    { label: "Total VCR",          value: stats.totalVouchers.toLocaleString("id-ID"),     sub: PERIOD_LABELS[period],       icon: <Ticket    className="w-5 h-5 text-blue-600 dark:text-blue-400"   />, bg: "bg-blue-50   dark:bg-blue-900/30"   },
    { label: "Total Revenue",       value: `Rp ${stats.totalRevenue.toLocaleString("id-ID")}`, sub: PERIOD_LABELS[period],    icon: <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400"  />, bg: "bg-green-50  dark:bg-green-900/30"  },
    { label: "Rata-rata / Hari",    value: stats.avgPerDay.toLocaleString("id-ID"),          sub: "voucher/hari",             icon: <BarChart2  className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/>, bg: "bg-indigo-50 dark:bg-indigo-900/30" },
    { label: "Profile Terpopuler",  value: stats.topProfile,                                 sub: "paling banyak dijual",     icon: <Star      className="w-5 h-5 text-amber-600 dark:text-amber-400"   />, bg: "bg-amber-50  dark:bg-amber-900/30"  },
  ]

  const ttStyle = { borderRadius: "12px", border: `1px solid ${ttBorder}`, background: ttBg, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }
  const ttItem  = { color: ttText, fontWeight: "bold" as const }
  const ttLabel = { color: tick, marginBottom: "8px" }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {(["today", "week", "month"] as const).map((p) => (
          <Link key={p} href={`?period=${p}`}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              period === p
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        {summaryCards.map((card) => (
          <div key={card.label}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 hover:-translate-y-0.5 hover:shadow-md transition-all animate-slide-up"
          >
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              {card.icon}
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">{card.value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors duration-200">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Penggunaan Saldo</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Total saldo: Rp {(walletData.spent + walletData.remaining).toLocaleString("id-ID")}</p>
          <div className="h-[240px] w-full">
            {walletData.spent === 0 && walletData.remaining === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">Belum ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v) => `Rp ${Number(v).toLocaleString("id-ID")}`} contentStyle={ttStyle} itemStyle={ttItem} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(v) => <span style={{ color: tick, fontSize: 12 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors duration-200">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Profile Terpopuler</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Berdasarkan {PERIOD_LABELS[period].toLowerCase()}</p>
          <div className="h-[240px] w-full">
            {profileData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">Belum ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profileData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} width={90} />
                  <RechartsTooltip formatter={(v) => [`${v} Voucher`, "Generated"]} contentStyle={ttStyle} itemStyle={ttItem} labelStyle={ttLabel} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {profileData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Trend Area */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors duration-200">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Trend Generate Voucher ({PERIOD_LABELS[period]})</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Total: {stats.totalVouchers} voucher</p>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: tick }} dy={10} interval="preserveStartEnd" />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: tick }} allowDecimals={false} />
              <RechartsTooltip contentStyle={ttStyle} itemStyle={ttItem} labelStyle={ttLabel} formatter={(v) => [`${v} Voucher`, "Generated"]} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
