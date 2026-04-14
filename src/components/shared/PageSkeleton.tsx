export function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-0 animate-pulse">
      {/* Title */}
      <div className="space-y-2">
        <div className="skeleton h-8 w-56 rounded-lg" />
        <div className="skeleton h-4 w-80 rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
            <div className="flex justify-between">
              <div className="skeleton h-12 w-12 rounded-xl" />
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-8 w-32 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-4">
          <div className="skeleton h-5 w-40 rounded" />
          <div className="skeleton h-48 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-3">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="flex items-center gap-3">
                <div className="skeleton h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <div className="skeleton h-3 w-28 rounded" />
                  <div className="skeleton h-3 w-20 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-pulse">
      {/* header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700">
        <div className="skeleton h-9 w-64 rounded-lg" />
      </div>
      {/* thead */}
      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700 flex gap-6">
        {[...Array(cols)].map((_, i) => (
          <div key={i} className="skeleton h-3 w-20 rounded" />
        ))}
      </div>
      {/* rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center gap-6">
          <div className="skeleton h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3 w-32 rounded" />
            <div className="skeleton h-2.5 w-24 rounded" />
          </div>
          {[...Array(cols - 2)].map((_, j) => (
            <div key={j} className="skeleton h-4 w-20 rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <div className="skeleton h-3 w-28 rounded" />
              <div className="skeleton h-2.5 w-20 rounded" />
            </div>
          </div>
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-3/4 rounded" />
          <div className="flex gap-2 mt-2">
            <div className="skeleton h-8 flex-1 rounded-lg" />
            <div className="skeleton h-8 flex-1 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
