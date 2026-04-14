"use client"

import { ErrorState } from "@/components/shared/ErrorState"
import { useEffect } from "react"

export default function GlobalError({
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
    <html>
      <body className="bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg w-full max-w-md">
          <ErrorState
            title="Aplikasi Mengalami Masalah"
            message={error.message || "Terjadi kesalahan yang tidak terduga."}
            onReset={reset}
          />
        </div>
      </body>
    </html>
  )
}
