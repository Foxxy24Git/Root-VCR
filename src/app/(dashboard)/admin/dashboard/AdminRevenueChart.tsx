"use client"

import * as React from "react"
import { 
  Area, AreaChart, CartesianGrid, Tooltip as RechartsTooltip, 
  XAxis, YAxis, ResponsiveContainer 
} from "recharts"

interface RevenueData {
  date: string
  revenue: number
  count: number
}

interface AdminRevenueChartProps {
  data: RevenueData[]
}

export function AdminRevenueChart({ data }: AdminRevenueChartProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <h3 className="font-bold text-slate-900 mb-6">Trend Penjualan (7 Hari Terakhir)</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(value) => `Rp ${value.toLocaleString("id-ID")}`}
              width={80}
            />
            <RechartsTooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
              formatter={(value: unknown) => [`Rp ${Number(value).toLocaleString("id-ID")}`, 'Omset']}
              labelStyle={{ color: '#64748b', marginBottom: '8px' }}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
