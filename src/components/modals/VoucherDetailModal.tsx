"use client"

import * as React from "react"
import { Copy, CreditCard, Info } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export interface VoucherDetail {
  id: string
  code: string
  profile: string | null
  generated_at: string
  used_at: string | null
  expired_at: string | null
  status: string
  client_ip: string | null
  client_mac: string | null
  price_charged: number
}

interface VoucherDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucher: VoucherDetail | null
}

export function VoucherDetailModal({
  open,
  onOpenChange,
  voucher,
}: VoucherDetailModalProps) {
  const [copied, setCopied] = React.useState(false)
  const [view, setView] = React.useState<"details" | "card">("details")

  React.useEffect(() => {
    if (!open) {
      setView("details")
      setCopied(false)
    }
  }, [open])

  if (!voucher) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(voucher.code)
    } catch {
      const el = document.createElement("textarea")
      el.value = voucher.code
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    unused: "bg-yellow-100 text-yellow-700",
    expired: "bg-red-100 text-red-700",
    deleted: "bg-slate-100 text-slate-700",
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Detail Voucher</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setView("details")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  view === "details"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Info className="w-3 h-3" /> Detail
              </button>
              <button
                onClick={() => setView("card")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  view === "card"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <CreditCard className="w-3 h-3" /> Card
              </button>
            </div>
          </div>

          {view === "card" ? (
            <div className="p-6">
              <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-xl overflow-hidden">
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/10 blur-xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                      VOUCHER WIFI
                    </span>
                    <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-white/20">
                      {voucher.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-center my-5">
                    <span className="block text-xs opacity-70 mb-1 uppercase tracking-wider">
                      Kode Voucher
                    </span>
                    <span className="text-3xl font-bold tracking-widest">
                      {voucher.code}
                    </span>
                  </div>
                  <div className="border-t border-white/20 pt-4 mt-2 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="opacity-70 block mb-0.5">Profile</span>
                      <span className="font-semibold">
                        {voucher.profile ?? "-"}
                      </span>
                    </div>
                    <div>
                      <span className="opacity-70 block mb-0.5">Expired</span>
                      <span className="font-semibold">
                        {voucher.expired_at
                          ? new Date(voucher.expired_at).toLocaleDateString(
                              "id-ID"
                            )
                          : "-"}
                      </span>
                    </div>
                    {voucher.client_ip && (
                      <div className="col-span-2">
                        <span className="opacity-70 block mb-0.5">
                          Client IP
                        </span>
                        <span className="font-semibold font-mono">
                          {voucher.client_ip}
                        </span>
                      </div>
                    )}
                    {voucher.client_mac && (
                      <div className="col-span-2">
                        <span className="opacity-70 block mb-0.5">
                          Client MAC
                        </span>
                        <span className="font-semibold font-mono">
                          {voucher.client_mac}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <span className="block text-xs text-slate-400 uppercase tracking-wider mb-2">
                  Kode Voucher
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-widest">
                  {voucher.code}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Profile
                  </span>
                  <p className="font-semibold text-slate-900">
                    {voucher.profile ?? "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Status
                  </span>
                  <p>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor[voucher.status] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {voucher.status.toUpperCase()}
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Generated At
                  </span>
                  <p className="font-medium text-slate-700 text-xs">
                    {formatDate(voucher.generated_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Used At
                  </span>
                  <p className="font-medium text-slate-700 text-xs">
                    {formatDate(voucher.used_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Expired At
                  </span>
                  <p className="font-medium text-slate-700 text-xs">
                    {formatDate(voucher.expired_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Price
                  </span>
                  <p className="font-semibold text-slate-900">
                    Rp {voucher.price_charged.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Client IP
                  </span>
                  <p className="font-medium text-slate-700 font-mono text-sm">
                    {voucher.client_ip ?? "-"}
                  </p>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Client MAC
                  </span>
                  <p className="font-medium text-slate-700 font-mono text-sm">
                    {voucher.client_mac ?? "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                copied
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Copy className="w-4 h-4" />
              {copied ? "Tersalin!" : "Salin Kode"}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
