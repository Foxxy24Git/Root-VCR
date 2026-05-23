"use client"

import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { AlertCircle } from "lucide-react"
import { InvoiceStatusBadge } from "@/app/super-admin/_components/InvoiceStatusBadge"
import type { InvoiceStatus } from "@prisma/client"

export interface InvoiceRow {
  id: string
  invoice_number: string
  amount: string
  period_start: string
  period_end: string
  status: InvoiceStatus
  paid_at: string | null
  created_at: string
  tenant: {
    id: string
    name: string
    slug: string
  }
}

interface Props {
  invoices: InvoiceRow[]
  meta: {
    total: number
    page: number
    page_size: number
    total_pages: number
  }
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Semua Status" },
  { value: "AWAITING_VERIFICATION", label: "Menunggu Verifikasi" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Lunas" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
]

const idr = (v: string | number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v))

const dateFmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—"

export function InvoiceListClient({ invoices, meta }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString())
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      next.delete("page")
      router.push(`${pathname}?${next.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const buildPageHref = (p: number) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set("page", String(p))
    return `${pathname}?${next.toString()}`
  }

  const currentStatus = searchParams.get("status") ?? ""
  const currentSearch = searchParams.get("search") ?? ""

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          defaultValue={currentSearch}
          placeholder="Cari no. invoice / tenant..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParam("search", (e.target as HTMLInputElement).value.trim())
            }
          }}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
        />
        <select
          value={currentStatus}
          onChange={(e) => updateParam("status", e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-16 text-sm text-slate-500 dark:text-slate-400">
            Tidak ada invoice ditemukan.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-5 py-3">No. Invoice</th>
                    <th className="text-left font-semibold px-5 py-3">Tenant</th>
                    <th className="text-left font-semibold px-5 py-3">Periode</th>
                    <th className="text-right font-semibold px-5 py-3">Jumlah</th>
                    <th className="text-left font-semibold px-5 py-3">Status</th>
                    <th className="text-left font-semibold px-5 py-3">Dibuat</th>
                    <th className="text-right font-semibold px-5 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {invoices.map((inv) => {
                    const needsAction = inv.status === "AWAITING_VERIFICATION"
                    return (
                      <tr
                        key={inv.id}
                        className={
                          "transition-colors " +
                          (needsAction
                            ? "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            : "hover:bg-slate-50/70 dark:hover:bg-slate-700/30")
                        }
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {needsAction && (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                            <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                              {inv.invoice_number}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/super-admin/tenants/${inv.tenant.id}`}
                            className="font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {inv.tenant.name}
                          </Link>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {inv.tenant.slug}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {dateFmt(inv.period_start)} – {dateFmt(inv.period_end)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {idr(inv.amount)}
                        </td>
                        <td className="px-5 py-3">
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {dateFmt(inv.created_at)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/super-admin/invoices/${inv.id}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                          >
                            Detail
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 px-5 py-3 text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  {meta.total.toLocaleString("id-ID")} invoice · Hal {meta.page} dari{" "}
                  {meta.total_pages}
                </span>
                <div className="flex items-center gap-2">
                  {meta.page > 1 && (
                    <Link
                      href={buildPageHref(meta.page - 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 text-sm"
                    >
                      Sebelumnya
                    </Link>
                  )}
                  {meta.page < meta.total_pages && (
                    <Link
                      href={buildPageHref(meta.page + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 text-sm"
                    >
                      Selanjutnya
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
