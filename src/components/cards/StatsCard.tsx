import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react"

export interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  icon: LucideIcon
  iconClassName?: string
  trend?: {
    value: number
    label: string
  }
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  trend,
  className,
  ...props
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white p-5",
        "border border-slate-100 shadow-sm transition-all duration-200",
        "hover:-translate-y-1 hover:shadow-md",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600", iconClassName)}>
          <Icon className="h-6 w-6" />
        </div>
        
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              trend.value >= 0
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-600"
            )}
          >
            {trend.value >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
          {title}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
            {value}
          </h3>
          {trend?.label && (
            <p className="text-xs font-medium text-slate-400">
              {trend.label}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
