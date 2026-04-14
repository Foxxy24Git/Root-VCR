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
        "relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-5",
        "border border-slate-100 dark:border-slate-700 shadow-sm transition-all duration-200",
        "hover:-translate-y-1 hover:shadow-md dark:hover:shadow-slate-900/40",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400", iconClassName)}>
          <Icon className="h-6 w-6" />
        </div>

        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              trend.value >= 0
                ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
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
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {value}
          </h3>
          {trend?.label && (
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {trend.label}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
