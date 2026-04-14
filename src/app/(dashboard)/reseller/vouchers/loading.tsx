import { TableSkeleton } from "@/components/shared/PageSkeleton"

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-0 animate-pulse">
      <div className="space-y-2">
        <div className="skeleton h-8 w-44 rounded-lg" />
        <div className="skeleton h-4 w-60 rounded-lg" />
      </div>
      <TableSkeleton rows={6} cols={4} />
    </div>
  )
}
