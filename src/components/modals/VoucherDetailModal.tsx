"use client"

import * as React from "react"
import { Copy, CreditCard, Info, Share2, Loader2, LogOut, Cookie, Trash2 } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export interface VoucherDetail {
  id: string
  code: string
  profile: string | null
  user_name: string | null
  generated_at: string
  used_at: string | null
  expired_at: string | null
  status: string
  client_ip: string | null
  client_mac: string | null
  price_charged: number
  password?: string | null
}

interface VoucherDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucher: VoucherDetail | null
  onActionSuccess?: () => void
  isAdmin?: boolean
}

const idrFmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v)

const statusColor: Record<string, string> = {
  active: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  unused: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400",
  expired: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  deleted: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
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

function resolvePasswordDisplay(password: string | null | undefined, code: string): string {
  if (password !== null && password !== undefined) {
    return password === code ? "sama dengan kode" : password
  }
  // old voucher: null password — username always equals code in this system
  return code
}

export function VoucherDetailModal({
  open,
  onOpenChange,
  voucher,
  onActionSuccess,
  isAdmin = false,
}: VoucherDetailModalProps) {
  const [copied, setCopied] = React.useState(false)
  const [view, setView] = React.useState<"details" | "card">("details")
  const [actionLoading, setActionLoading] = React.useState<"cookie" | "logout" | "delete" | null>(null)
  const [actionMsg, setActionMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null)

  React.useEffect(() => {
    if (!open) {
      setView("details")
      setCopied(false)
      setActionMsg(null)
      setActionLoading(null)
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

  const shareText = encodeURIComponent(`🌐 Voucher WiFi\nKode: ${voucher.code}\nProfile: ${voucher.profile ?? "-"}\nHarga: ${idrFmt(voucher.price_charged)}`)

  const handleShare = (platform: "wa" | "tg") => {
    const url =
      platform === "wa"
        ? `https://wa.me/?text=${shareText}`
        : `https://t.me/share/url?url=&text=${shareText}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const doAction = async (action: "cookie" | "logout") => {
    setActionLoading(action)
    setActionMsg(null)
    try {
      const res = await fetch(
        `/api/vouchers/${voucher.id}/${action === "cookie" ? "cookie" : "logout"}`,
        { method: action === "cookie" ? "DELETE" : "POST" }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal")
      setActionMsg({ type: "ok", text: data.message })
      onActionSuccess?.()
    } catch (e: unknown) {
      setActionMsg({ type: "err", text: e instanceof Error ? e.message : "Terjadi kesalahan" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Hapus voucher "${voucher.code}"? Voucher akan dihapus dari MikroTik dan database.`)) return
    setActionLoading("delete")
    setActionMsg(null)
    try {
      const res = await fetch(`/api/vouchers/${voucher.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || "Gagal menghapus")
      onActionSuccess?.()
      onOpenChange(false)
    } catch (e: unknown) {
      setActionMsg({ type: "err", text: e instanceof Error ? e.message : "Terjadi kesalahan" })
      setActionLoading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 border-0 shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden">
        <div className="bg-white dark:bg-slate-800 flex flex-col overflow-hidden min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Detail Voucher</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setView("details")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  view === "details"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                <Info className="w-3 h-3" /> Detail
              </button>
              <button
                onClick={() => setView("card")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  view === "card"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                <CreditCard className="w-3 h-3" /> Card
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          {view === "card" ? (
            <div className="p-6 overflow-y-auto flex-1">
              <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-xl overflow-hidden">
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/10 blur-xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80">VOUCHER WIFI</span>
                    <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-white/20">
                      {voucher.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-center my-5">
                    <span className="block text-xs opacity-70 mb-1 uppercase tracking-wider">Kode Voucher</span>
                    <span className="text-3xl font-bold tracking-widest">{voucher.code}</span>
                  </div>
                  <div className="border-t border-white/20 pt-4 mt-2 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="opacity-70 block mb-0.5">Profile</span>
                      <span className="font-semibold">{voucher.profile ?? "-"}</span>
                    </div>
                    <div>
                      <span className="opacity-70 block mb-0.5">Harga</span>
                      <span className="font-semibold">{idrFmt(voucher.price_charged)}</span>
                    </div>
                    <div>
                      <span className="opacity-70 block mb-0.5">Expired</span>
                      <span className="font-semibold">
                        {voucher.expired_at ? new Date(voucher.expired_at).toLocaleDateString("id-ID") : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="opacity-70 block mb-0.5">Reseller</span>
                      <span className="font-semibold">{voucher.user_name ?? "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="opacity-70 block mb-0.5">Password</span>
                      <span className="font-semibold font-mono">
                        {resolvePasswordDisplay(voucher.password, voucher.code)}
                      </span>
                    </div>
                    {voucher.client_ip && (
                      <div className="col-span-2">
                        <span className="opacity-70 block mb-0.5">Client IP</span>
                        <span className="font-semibold font-mono">{voucher.client_ip}</span>
                      </div>
                    )}
                    {voucher.client_mac && (
                      <div className="col-span-2">
                        <span className="opacity-70 block mb-0.5">Client MAC</span>
                        <span className="font-semibold font-mono">{voucher.client_mac}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Detail View */
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                <span className="block text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Kode Voucher</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-widest">{voucher.code}</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">Password</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tracking-wider">
                  {resolvePasswordDisplay(voucher.password, voucher.code)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Profile</span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{voucher.profile ?? "-"}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</span>
                  <p>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor[voucher.status] ?? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
                      {voucher.status.toUpperCase()}
                    </span>
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Reseller</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{voucher.user_name ?? "-"}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Harga</span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{idrFmt(voucher.price_charged)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Generated At</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">{formatDate(voucher.generated_at)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Used At</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">{formatDate(voucher.used_at)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Expired At</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">{formatDate(voucher.expired_at)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Client IP</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 font-mono text-xs">{voucher.client_ip ?? "-"}</p>
                </div>
                <div className="col-span-2 space-y-0.5">
                  <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Client MAC</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 font-mono text-sm">{voucher.client_mac ?? "-"}</p>
                </div>
              </div>

              {/* MikroTik Actions */}
              <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Aksi MikroTik</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => doAction("cookie")}
                    disabled={!!actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-700 dark:text-orange-400 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {actionLoading === "cookie" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cookie className="w-3.5 h-3.5" />}
                    Hapus Cookie
                  </button>
                  <button
                    onClick={() => doAction("logout")}
                    disabled={!!actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {actionLoading === "logout" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                    Logout Sesi
                  </button>
                </div>
                {actionMsg && (
                  <p className={`text-xs mt-2 px-3 py-1.5 rounded-lg ${actionMsg.type === "ok" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"}`}>
                    {actionMsg.text}
                  </p>
                )}
              </div>

              {/* Admin: Delete voucher */}
              {isAdmin && voucher.status !== "active" && (
                <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Hapus Voucher</p>
                  <button
                    onClick={handleDelete}
                    disabled={!!actionLoading}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {actionLoading === "delete" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Hapus dari MikroTik &amp; DB
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="px-6 pb-6 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  copied
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50"
                    : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
                }`}
              >
                <Copy className="w-4 h-4" />
                {copied ? "Tersalin!" : "Salin Kode"}
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-sm transition-colors"
              >
                Tutup
              </button>
            </div>
            {/* Share */}
            <div className="flex gap-2">
              <button
                onClick={() => handleShare("wa")}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-semibold transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                onClick={() => handleShare("tg")}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-semibold transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Telegram
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
