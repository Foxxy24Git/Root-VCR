"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, Loader2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { InvoiceStatus } from "@prisma/client"

interface Props {
  invoiceId: string
  status: InvoiceStatus
  proofUrl: string | null
}

export function InvoiceActions({ invoiceId, status }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [verifyOpen, setVerifyOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("BCA Transfer")
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [verifyNotes, setVerifyNotes] = useState("")

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const canAct = status === "AWAITING_VERIFICATION"

  async function handleVerify() {
    setBusy("verify")
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/super-admin/invoices/${invoiceId}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method: paymentMethod,
          paid_at: new Date(paidAt).toISOString(),
          notes: verifyNotes || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data?.message ?? "Gagal memverifikasi")
        return
      }
      setVerifyOpen(false)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function handleReject() {
    if (rejectReason.trim().length < 5) {
      setErrorMsg("Alasan minimal 5 karakter")
      return
    }
    setBusy("reject")
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/super-admin/invoices/${invoiceId}/reject-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data?.message ?? "Gagal menolak")
        return
      }
      setRejectOpen(false)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  if (!canAct) return null

  return (
    <>
      {errorMsg && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-2">{errorMsg}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => {
            setErrorMsg(null)
            setVerifyOpen(true)
          }}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
        >
          <CheckCircle className="w-4 h-4" />
          Verifikasi Lunas
        </button>
        <button
          onClick={() => {
            setErrorMsg(null)
            setRejectOpen(true)
          }}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50"
        >
          <XCircle className="w-4 h-4" />
          Tolak Bukti
        </button>
      </div>

      {/* Verify dialog */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Pembayaran</DialogTitle>
            <DialogDescription>
              Konfirmasi bahwa transfer sudah diterima dan invoice ini lunas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Metode Pembayaran
              </label>
              <input
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="BCA Transfer, Mandiri, DANA, dll"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Tanggal Bayar
              </label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Catatan (opsional)
              </label>
              <textarea
                rows={2}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setVerifyOpen(false)}
              className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <X className="w-3.5 h-3.5 inline mr-1" />
              Batal
            </button>
            <button
              onClick={handleVerify}
              disabled={busy === "verify" || !paymentMethod.trim() || !paidAt}
              className="px-4 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy === "verify" ? (
                <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
              )}
              Konfirmasi Lunas
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Bukti Transfer</DialogTitle>
            <DialogDescription>
              Bukti transfer ditolak, invoice kembali ke status PENDING. Customer perlu upload ulang.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Alasan Penolakan
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Mis. Bukti tidak terbaca, jumlah tidak sesuai, dll"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setRejectOpen(false)}
              className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              onClick={handleReject}
              disabled={busy === "reject" || rejectReason.trim().length < 5}
              className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy === "reject" ? (
                <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5 inline mr-1" />
              )}
              Tolak
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
