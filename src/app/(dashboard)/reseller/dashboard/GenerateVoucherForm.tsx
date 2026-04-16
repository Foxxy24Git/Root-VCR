"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2, Ticket, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { VoucherSuccessModal, VoucherGeneratedData } from "@/components/modals/VoucherSuccessModal"
import { cn } from "@/lib/utils"

interface AvailableProfile {
  id: string
  name: string
  duration_days: number
  basePrice: number
  resellerPrice: number
}

interface GenerateVoucherFormProps {
  availableProfiles: AvailableProfile[]
  currentBalance: number
}

export function GenerateVoucherForm({ availableProfiles, currentBalance }: GenerateVoucherFormProps) {
  const router = useRouter()
  const [profileId, setProfileId] = useState<string>(availableProfiles[0]?.id ?? "")
  const [quantity, setQuantity] = useState<number>(1)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [generatedVouchers, setGeneratedVouchers] = useState<VoucherGeneratedData[]>([])

  const selectedProfile = availableProfiles.find(p => p.id === profileId)
  const totalCost = selectedProfile ? selectedProfile.resellerPrice * quantity : 0
  const isInsufficientBalance = totalCost > currentBalance

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId || quantity < 1) return
    
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/vouchers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, quantity })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || data.error || "Gagal generate voucher")
      }

      // Map response to our modal format
      const vouchersForModal = data.vouchers.map((v: { code: string; password?: string | null; profile: { name: string; duration_days: number; duration_hours: number } }) => ({
        code: v.code,
        password: v.password ?? null,
        profileName: v.profile.name,
        durationDays: v.profile.duration_days * 24 + v.profile.duration_hours,
      }))

      setGeneratedVouchers(vouchersForModal)
      setModalOpen(true)
      
      // Reset form
      setQuantity(1)
      router.refresh() // Refresh page to update balance and recent vouchers

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Terjadi kesalahan tidak terduga.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (availableProfiles.length === 0) {
    return (
      <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-4 rounded-xl border border-orange-100 dark:border-orange-800/50 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm">Anda belum memiliki akses ke profile VCR apapun. Silakan hubungi Admin.</p>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleGenerate} className="space-y-5 relative">
        
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
                {availableProfiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Rp {p.basePrice.toLocaleString("id-ID")} (Anda: Rp {p.resellerPrice.toLocaleString("id-ID")})
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

        <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Biaya:</span>
          <span className={cn(
            "text-lg font-bold",
            isInsufficientBalance ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"
          )}>
            Rp {totalCost.toLocaleString("id-ID")}
          </span>
        </div>

        <button
          type="submit"
          disabled={loading || isInsufficientBalance}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all",
            "bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5",
            "disabled:opacity-60 disabled:pointer-events-none disabled:transform-none"
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Ticket className="w-5 h-5" />
              GENERATE VOUCHER
            </>
          )}
        </button>

        {isInsufficientBalance && (
          <p className="text-xs text-red-500 text-center font-medium mt-2">
            Saldo Anda tidak mencukupi untuk jumlah ini.
          </p>
        )}
      </form>

      <VoucherSuccessModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vouchers={generatedVouchers}
      />
    </>
  )
}
