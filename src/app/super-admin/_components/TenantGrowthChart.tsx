"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"

export interface GrowthPoint {
  date: string
  total: number
  newToday: number
}

export function TenantGrowthChart({ data }: { data: GrowthPoint[] }) {
  const [isDark, setIsDark] = React.useState(false)

  React.useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => obs.disconnect()
  }, [])

  const gridColor = isDark ? "#334155" : "#f1f5f9"
  const tickColor = isDark ? "#94a3b8" : "#64748b"
  const tooltipBg = isDark ? "#1e293b" : "#ffffff"
  const tooltipBorder = isDark ? "#334155" : "#f1f5f9"
  const tooltipText = isDark ? "#e2e8f0" : "#0f172a"

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            Pertumbuhan Tenant
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            30 hari terakhir
          </p>
        </div>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorTenant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={gridColor}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: tickColor }}
              dy={10}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: tickColor }}
              width={36}
              allowDecimals={false}
            />
            <RechartsTooltip
              contentStyle={{
                borderRadius: "12px",
                border: `1px solid ${tooltipBorder}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                background: tooltipBg,
              }}
              itemStyle={{ color: tooltipText, fontWeight: 600 }}
              labelStyle={{ color: tickColor, marginBottom: "6px" }}
              formatter={(value: unknown, key) => [
                Number(value).toLocaleString("id-ID"),
                key === "total" ? "Total Tenant" : "Tenant Baru",
              ]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorTenant)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
