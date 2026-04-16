"use client"

import * as React from "react"
import { CheckCircle2, Copy, Share2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

export interface VoucherGeneratedData {
  code: string
  profileName: string
  durationDays: number
  password?: string | null
}

interface VoucherSuccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vouchers: VoucherGeneratedData[]
}

export function VoucherSuccessModal({
  open,
  onOpenChange,
  vouchers,
}: VoucherSuccessModalProps) {
  const voucher = vouchers[0]

  const hasPassword = voucher?.password != null

  const handleCopy = async () => {
    if (!voucher) return
    const text = hasPassword
      ? `Username: ${voucher.code}\nPassword: ${voucher.password}\nProfile: ${voucher.profileName}`
      : `Kode: ${voucher.code}\nProfile: ${voucher.profileName}`
    try {
      await navigator.clipboard.writeText(text)
      alert("Kode voucher disalin!")
    } catch {
      alert("Gagal menyalin")
    }
  }

  const handleShareWhatsApp = () => {
    if (!voucher) return
    const credentialLines = hasPassword
      ? `Username: ${voucher.code}\nPassword: ${voucher.password}`
      : `Kode: ${voucher.code}`
    const text = `🎫 VOUCHER WIFI ROOT.VCR\n━━━━━━━━━━━━━━━━━━━━━━\n${credentialLines}\nProfile: ${voucher.profileName}\nMasa Aktif: ${voucher.durationDays} Jam\n\n📶 Login di: hotspot\n━━━━━━━━━━━━━━━━━━━━━━`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, "_blank")
  }

  if (!voucher) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-0 shadow-2xl">
        <div className="relative p-6 pt-10 text-center bg-white dark:bg-slate-800 flex flex-col items-center">

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">SUCCESS</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Voucher ready for use</p>

          <div className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-5 mb-6 relative">
            {/* Dashed line effect */}
            <div className="absolute top-0 bottom-0 left-[-8px] flex flex-col justify-between py-2">
               {[...Array(6)].map((_, i) => (
                 <div key={i} className="w-2 h-4 bg-white dark:bg-slate-800 rounded-r-full border-r border-y border-slate-200 dark:border-slate-600" />
               ))}
            </div>
            <div className="absolute top-0 bottom-0 right-[-8px] flex flex-col justify-between py-2">
               {[...Array(6)].map((_, i) => (
                 <div key={i} className="w-2 h-4 bg-white dark:bg-slate-800 rounded-l-full border-l border-y border-slate-200 dark:border-slate-600" />
               ))}
            </div>

            {hasPassword ? (
              <div className="space-y-2 mb-4">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Username</div>
                  <div className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg py-2 px-4">
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-widest">{voucher.code}</span>
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Password</div>
                  <div className="bg-white dark:bg-slate-700 border-2 border-blue-200 dark:border-blue-600 rounded-lg py-2 px-4">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400 tracking-widest">{voucher.password}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  KODE VOUCHER
                </div>
                <div className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg py-3 px-4 mx-auto max-w-[200px] mb-4">
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-widest">{voucher.code}</span>
                </div>
              </>
            )}

            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1 mt-4 border-t border-dashed border-slate-300 dark:border-slate-600 pt-4">
              <p>Profile: <span className="font-semibold text-slate-900 dark:text-slate-100">{voucher.profileName}</span></p>
              <p>Masa Aktif: <span className="font-semibold text-slate-900 dark:text-slate-100">{voucher.durationDays} Jam</span></p>
              {hasPassword && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium pt-1">
                  ⚠️ Simpan password ini — tidak akan ditampilkan lagi
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full mb-4">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors"
            >
              <Copy className="w-4 h-4" /> Salin
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-transparent bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 font-semibold transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share WA
            </button>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold transition-colors mt-2"
          >
            DONE, BACK TO DASHBOARD
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
