export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-0 animate-pulse">
      <div className="space-y-2">
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="skeleton h-4 w-56 rounded-lg" />
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="skeleton h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-28 rounded" />
            <div className="skeleton h-3 w-36 rounded" />
          </div>
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        ))}
        <div className="skeleton h-10 w-28 rounded-lg ml-auto" />
      </div>
    </div>
  )
}
