import { TableSkeleton } from "@/components/shared/PageSkeleton"

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-0 animate-pulse">
      <div className="space-y-2">
        <div className="skeleton h-8 w-52 rounded-lg" />
        <div className="skeleton h-4 w-64 rounded-lg" />
      </div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-9 w-36 rounded-lg" />
        ))}
      </div>
      <TableSkeleton rows={6} cols={5} />
    </div>
  )
}
