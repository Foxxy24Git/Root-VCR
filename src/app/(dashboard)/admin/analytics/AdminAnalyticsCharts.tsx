"use client"

import * as React from "react"
import {
  Area, AreaChart, CartesianGrid, Tooltip as RechartsTooltip,
  XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie, Legend,
} from "recharts"

interface RevenueData { date: string; revenue: number; count: number }
interface ResellerData { name: string; omset: number; vouchers: number }
interface ProfileData  { name: string; value: number }

interface AdminAnalyticsChartsProps {
  revenueData:   RevenueData[]
  resellerData:  ResellerData[]
  profileData:   ProfileData[]
  totalRevenue:  number
  totalVouchers: number
}

const COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"]
const rupiahFormatter = (v: number) => `Rp ${v.toLocaleString("id-ID")}`

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

export function AdminAnalyticsCharts({ revenueData, resellerData, profileData, totalRevenue, totalVouchers }: AdminAnalyticsChartsProps) {
  const isDark = useDark()
  const grid    = isDark ? "#334155" : "#f1f5f9"
  const tick    = isDark ? "#94a3b8" : "#64748b"
  const ttStyle = { borderRadius: "12px", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, background: isDark ? "#1e293b" : "#ffffff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }

  return (
    <div className="space-y-8">
      {/* Revenue Trend */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 transition-colors duration-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Revenue Trend (7 Hari)</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Total: Rp {totalRevenue.toLocaleString("id-ID")}</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">
            {totalVouchers} voucher
          </span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={rupiahFormatter} tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} width={80} />
            <RechartsTooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`Rp ${Number(value).toLocaleString("id-ID")}`, "Revenue"]}
              contentStyle={ttStyle}
            />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#adminRevenueGrad)" dot={{ r: 3, fill: "#3b82f6" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Resellers Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 transition-colors duration-200">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-6">Top Reseller (Omset)</h3>
          {resellerData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={resellerData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                <XAxis type="number" tickFormatter={rupiahFormatter} tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} width={80} />
                <RechartsTooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`Rp ${Number(value).toLocaleString("id-ID")}`, "Omset"]}
                  contentStyle={ttStyle}
                />
                <Bar dataKey="omset" radius={[0, 6, 6, 0]}>
                  {resellerData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Profile Donut */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 transition-colors duration-200">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-6">Popularitas Profile</h3>
          {profileData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={profileData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {profileData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [`${value} voucher`, name]}
                  contentStyle={ttStyle}
                />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12, color: tick }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Daily Voucher Count Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 transition-colors duration-200">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-6">Jumlah Voucher Harian</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} width={30} />
            <RechartsTooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`${value}`, "Voucher"]}
              contentStyle={ttStyle}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#06b6d4" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
