"use client"

import { ErrorState } from "@/components/shared/ErrorState"
import { useEffect } from "react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="max-w-7xl mx-auto py-12">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm animate-scale-in">
        <ErrorState
          title="Gagal Memuat Halaman"
          message={error.message || "Terjadi kesalahan saat memuat data. Silakan coba lagi."}
          onReset={reset}
        />
      </div>
    </div>
  )
}
