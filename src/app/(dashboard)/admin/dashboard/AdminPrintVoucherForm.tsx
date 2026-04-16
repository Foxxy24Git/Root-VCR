"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2, Printer, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { VoucherSuccessModal, VoucherGeneratedData } from "@/components/modals/VoucherSuccessModal"
import { cn } from "@/lib/utils"

interface Profile {
  id: string
  name: string
  duration_days: number
  duration_hours: number
}

interface AdminPrintVoucherFormProps {
  profiles: Profile[]
}

export function AdminPrintVoucherForm({ profiles }: AdminPrintVoucherFormProps) {
  const router = useRouter()
  const [profileId, setProfileId] = useState<string>(profiles[0]?.id ?? "")
  const [quantity, setQuantity] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [generatedVouchers, setGeneratedVouchers] = useState<VoucherGeneratedData[]>([])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId || quantity < 1) return

    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/vouchers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, quantity }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || data.error || "Gagal generate voucher")
      }

      const vouchersForModal: VoucherGeneratedData[] = data.vouchers.map(
        (v: { code: string; password?: string | null; profile: { name: string; duration_days: number; duration_hours: number } }) => ({
          code: v.code,
          password: v.password ?? null,
          profileName: v.profile.name,
          durationDays: v.profile.duration_days * 24 + v.profile.duration_hours,
        })
      )

      setGeneratedVouchers(vouchersForModal)
      setModalOpen(true)
      setQuantity(1)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga.")
    } finally {
      setLoading(false)
    }
  }

  if (profiles.length === 0) {
    return (
      <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-4 rounded-xl border border-orange-100 dark:border-orange-800/50 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm">Belum ada profile aktif. Tambahkan profile di halaman Vouchers.</p>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleGenerate} className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-100 dark:border-red-800/50 flex gap-2 items-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Pilih Profile
            </label>
            <div className="relative">
              <select
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                className="w-full appearance-none bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                disabled={loading}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.duration_days > 0 ? ` — ${p.duration_days} Hari` : ""}{p.duration_hours > 0 ? ` ${p.duration_hours} Jam` : ""}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Jumlah Voucher
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all",
            "bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-0.5",
            "disabled:opacity-60 disabled:pointer-events-none disabled:transform-none"
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Printer className="w-5 h-5" />
              CETAK VOUCHER
            </>
          )}
        </button>
      </form>

      <VoucherSuccessModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vouchers={generatedVouchers}
      />
    </>
  )
}
