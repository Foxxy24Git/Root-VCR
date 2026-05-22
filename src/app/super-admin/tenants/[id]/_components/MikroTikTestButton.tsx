"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Wifi, Loader2, CheckCircle2, XCircle } from "lucide-react"

export function MikroTikTestButton({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  )

  async function runTest() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(
        `/api/super-admin/tenants/${tenantId}/test-mikrotik`,
        { method: "POST" },
      )
      const data = await res.json()
      setResult({ ok: res.ok && data.ok, message: data.message ?? "—" })
      router.refresh()
    } catch {
      setResult({ ok: false, message: "Network error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={runTest}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 self-start"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wifi className="w-4 h-4" />
        )}
        Test Koneksi
      </button>
      {result && (
        <div
          className={
            "flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-medium " +
            (result.ok
              ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300")
          }
        >
          {result.ok ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  )
}
