"use client"

import * as React from "react"
import { Filter, FileText, FileDown, Ticket } from "lucide-react"
import { VoucherDetailModal, VoucherDetail } from "@/components/modals/VoucherDetailModal"
import { EmptyState } from "@/components/shared/EmptyState"

export type SerializedVoucher = {
  id: string; code: string; status: string; price_charged: number
  generated_at: string; used_at: string | null; expired_at: string | null
  client_ip: string | null; client_mac: string | null
  profile: { id: string; name: string } | null
}

interface VouchersClientProps { vouchers: SerializedVoucher[] }

export function VouchersClient({ vouchers }: VouchersClientProps) {
  const [selectedVoucher, setSelectedVoucher] = React.useState<VoucherDetail | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [exportLoading, setExportLoading] = React.useState<"excel" | "pdf" | null>(null)

  const handleRowClick = (v: SerializedVoucher) => {
    setSelectedVoucher({
      id: v.id, code: v.code, profile: v.profile?.name ?? null, user_name: null,
      generated_at: v.generated_at, used_at: v.used_at, expired_at: v.expired_at,
      status: v.status, client_ip: v.client_ip, client_mac: v.client_mac, price_charged: v.price_charged,
    })
    setModalOpen(true)
  }

  const handleExport = async (format: "excel" | "pdf") => {
    setExportLoading(format)
    try {
      const res = await fetch(`/api/vouchers/export?format=${format}`)
      if (!res.ok) throw new Error("Export gagal")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = format === "excel" ? `vouchers-${Date.now()}.xlsx` : `vouchers-${Date.now()}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) { console.error(err); alert("Gagal mengunduh file.") }
    finally { setExportLoading(null) }
  }

  const statusCls: Record<string, string> = {
    active:  "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
    unused:  "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400",
    expired: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
    deleted: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
  }
  const statusBadge = (s: string) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusCls[s] ?? statusCls.deleted}`}>
      {s.toUpperCase()}
    </span>
  )

  const fmtDate = (s: string | null, withTime = false) => {
    if (!s) return "-"
    return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) })
  }

  return (
    <>
      {/* Export Bar */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-end gap-2 bg-slate-50/30 dark:bg-slate-900/20">
        <button onClick={() => handleExport("pdf")} disabled={exportLoading !== null}
          className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-60">
          <FileDown className="w-4 h-4" />
          {exportLoading === "pdf" ? "Downloading..." : "PDF"}
        </button>
        <button onClick={() => handleExport("excel")} disabled={exportLoading !== null}
          className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/40 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-60">
          <FileText className="w-4 h-4" />
          {exportLoading === "excel" ? "Downloading..." : "Excel"}
        </button>
      </div>

      {/* Table (Desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            <tr>
              {["Kode Voucher","Profile","Generated","Digunakan","Status","Client IP","Harga Beli"].map((h,i) => (
                <th key={h} className={`px-6 py-4 font-semibold uppercase tracking-wider text-xs ${i === 6 ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
            {vouchers.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState icon={Ticket} title="Tidak ada voucher" description="Tidak ada voucher yang sesuai dengan filter Anda." />
                </td>
              </tr>
            ) : (
              vouchers.map((v) => (
                <tr key={v.id} onClick={() => handleRowClick(v)}
                  className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors cursor-pointer">
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 tracking-wider">{v.code}</td>
                  <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400">{v.profile?.name ?? "-"}</td>
                  <td className="px-6 py-4">{fmtDate(v.generated_at, true)}</td>
                  <td className="px-6 py-4">{fmtDate(v.used_at, true)}</td>
                  <td className="px-6 py-4">{statusBadge(v.status)}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">{v.client_ip ?? "-"}</td>
                  <td className="px-6 py-4 text-right font-medium">Rp {v.price_charged.toLocaleString("id-ID")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Card (Mobile) */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
        {vouchers.length === 0 ? (
          <EmptyState icon={Filter} title="Tidak ada data" description="Tidak ada voucher yang sesuai dengan filter Anda." />
        ) : (
          vouchers.map((v) => (
            <div key={v.id} onClick={() => handleRowClick(v)}
              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer active:bg-blue-50 dark:active:bg-blue-900/10">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-lg block tracking-wider">{v.code}</span>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{v.profile?.name ?? "-"}</span>
                </div>
                {statusBadge(v.status)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <span className="block text-slate-400 dark:text-slate-500 mb-0.5">Dibuat</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{fmtDate(v.generated_at)}</span>
                </div>
                <div>
                  <span className="block text-slate-400 dark:text-slate-500 mb-0.5">Digunakan</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{fmtDate(v.used_at)}</span>
                </div>
                {v.client_ip && (
                  <div className="col-span-2">
                    <span className="block text-slate-400 dark:text-slate-500 mb-0.5">Client IP</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{v.client_ip}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <VoucherDetailModal open={modalOpen} onOpenChange={setModalOpen} voucher={selectedVoucher} />
    </>
  )
}
