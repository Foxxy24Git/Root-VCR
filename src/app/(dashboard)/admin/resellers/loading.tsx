import { TableSkeleton } from "@/components/shared/PageSkeleton"

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-0 animate-pulse">
      <div className="space-y-2">
        <div className="skeleton h-8 w-56 rounded-lg" />
        <div className="skeleton h-4 w-72 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <div className="skeleton h-10 flex-1 max-w-xs rounded-lg" />
        <div className="skeleton h-10 w-32 rounded-lg" />
        <div className="skeleton h-10 w-40 rounded-xl ml-auto" />
      </div>
      <TableSkeleton rows={5} cols={6} />
    </div>
  )
}
