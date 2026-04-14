export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-0 animate-pulse">
      <div className="space-y-2">
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="skeleton h-4 w-64 rounded-lg" />
      </div>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {["Hari Ini", "Minggu Ini", "Bulan Ini"].map((t) => (
          <div key={t} className="skeleton h-8 w-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-3">
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-7 w-28 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <div className="skeleton h-5 w-36 rounded mb-4" />
          <div className="skeleton h-64 w-full rounded-xl" />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <div className="skeleton h-5 w-32 rounded mb-4" />
          <div className="skeleton h-48 w-48 rounded-full mx-auto" />
        </div>
      </div>
    </div>
  )
}
