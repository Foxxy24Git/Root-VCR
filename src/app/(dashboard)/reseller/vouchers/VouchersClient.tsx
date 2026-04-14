"use client"

import * as React from "react"
import { Filter, FileText, FileDown } from "lucide-react"
import { VoucherDetailModal, VoucherDetail } from "@/components/modals/VoucherDetailModal"

export type SerializedVoucher = {
  id: string
  code: string
  status: string
  price_charged: number
  generated_at: string
  used_at: string | null
  expired_at: string | null
  client_ip: string | null
  client_mac: string | null
  profile: { id: string; name: string } | null
}

interface VouchersClientProps {
  vouchers: SerializedVoucher[]
}

export function VouchersClient({ vouchers }: VouchersClientProps) {
  const [selectedVoucher, setSelectedVoucher] =
    React.useState<VoucherDetail | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [exportLoading, setExportLoading] = React.useState<
    "excel" | "pdf" | null
  >(null)

  const handleRowClick = (v: SerializedVoucher) => {
    setSelectedVoucher({
      id: v.id,
      code: v.code,
      profile: v.profile?.name ?? null,
      generated_at: v.generated_at,
      used_at: v.used_at,
      expired_at: v.expired_at,
      status: v.status,
      client_ip: v.client_ip,
      client_mac: v.client_mac,
      price_charged: v.price_charged,
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
      a.download =
        format === "excel"
          ? `vouchers-${Date.now()}.xlsx`
          : `vouchers-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert("Gagal mengunduh file. Silakan coba lagi.")
    } finally {
      setExportLoading(null)
    }
  }

  const statusBadge = (status: string) => {
    const cls: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      unused: "bg-yellow-100 text-yellow-700",
      expired: "bg-red-100 text-red-700",
      deleted: "bg-slate-100 text-slate-700",
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cls[status] ?? "bg-slate-100 text-slate-700"}`}
      >
        {status.toUpperCase()}
      </span>
    )
  }

  const fmtDate = (s: string | null, withTime = false) => {
    if (!s) return "-"
    return new Date(s).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    })
  }

  return (
    <>
      {/* Export Bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex justify-end gap-2 bg-slate-50/30">
        <button
          onClick={() => handleExport("pdf")}
          disabled={exportLoading !== null}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-60"
        >
          <FileDown className="w-4 h-4" />
          {exportLoading === "pdf" ? "Downloading..." : "PDF"}
        </button>
        <button
          onClick={() => handleExport("excel")}
          disabled={exportLoading !== null}
          className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-60"
        >
          <FileText className="w-4 h-4" />
          {exportLoading === "excel" ? "Downloading..." : "Excel"}
        </button>
      </div>

      {/* Table View (Desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-white border-b border-slate-100 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">
                Kode Voucher
              </th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">
                Profile
              </th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">
                Generated
              </th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">
                Digunakan
              </th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">
                Status
              </th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">
                Client IP
              </th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">
                Harga Beli
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {vouchers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-16 text-center text-slate-500"
                >
                  <Filter className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                  <p className="text-base font-medium text-slate-900">
                    Tidak ada data
                  </p>
                  <p className="text-sm">
                    Tidak ada voucher yang sesuai dengan filter Anda.
                  </p>
                </td>
              </tr>
            ) : (
              vouchers.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => handleRowClick(v)}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-bold text-slate-900 tracking-wider">
                    {v.code}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {v.profile?.name ?? "-"}
                  </td>
                  <td className="px-6 py-4">{fmtDate(v.generated_at, true)}</td>
                  <td className="px-6 py-4">{fmtDate(v.used_at, true)}</td>
                  <td className="px-6 py-4">{statusBadge(v.status)}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">
                    {v.client_ip ?? "-"}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    Rp {v.price_charged.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Card View (Mobile) */}
      <div className="md:hidden divide-y divide-slate-100">
        {vouchers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 px-4">
            <Filter className="w-8 h-8 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-medium text-slate-900">
              Tidak ada data
            </p>
          </div>
        ) : (
          vouchers.map((v) => (
            <div
              key={v.id}
              onClick={() => handleRowClick(v)}
              className="p-4 hover:bg-slate-50 transition-colors cursor-pointer active:bg-blue-50"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-bold text-slate-900 text-lg block tracking-wider">
                    {v.code}
                  </span>
                  <span className="text-sm font-medium text-blue-600">
                    {v.profile?.name ?? "-"}
                  </span>
                </div>
                {statusBadge(v.status)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                <div>
                  <span className="block text-slate-400 mb-0.5">Dibuat</span>
                  <span className="font-medium text-slate-700">
                    {fmtDate(v.generated_at)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 mb-0.5">Digunakan</span>
                  <span className="font-medium text-slate-700">
                    {fmtDate(v.used_at)}
                  </span>
                </div>
                {v.client_ip && (
                  <div className="col-span-2">
                    <span className="block text-slate-400 mb-0.5">
                      Client IP
                    </span>
                    <span className="font-mono font-medium text-slate-700">
                      {v.client_ip}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <VoucherDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        voucher={selectedVoucher}
      />
    </>
  )
}
