"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { Search, X } from "lucide-react"

const STATUS_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "trial", label: "Trial" },
  { value: "active", label: "Aktif" },
  { value: "suspended", label: "Suspended" },
  { value: "expired", label: "Expired" },
]

export function TenantListFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [search, setSearch] = useState(params.get("search") ?? "")
  const [status, setStatus] = useState(params.get("status") ?? "")
  const [, startTransition] = useTransition()

  // Push to URL with debounce on search input
  useEffect(() => {
    const handler = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (search) next.set("search", search)
      else next.delete("search")
      next.delete("page")
      const qs = next.toString()
      startTransition(() => {
        router.replace(qs ? `/super-admin/tenants?${qs}` : "/super-admin/tenants")
      })
    }, 300)
    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function changeStatus(value: string) {
    setStatus(value)
    const next = new URLSearchParams(params.toString())
    if (value) next.set("status", value)
    else next.delete("status")
    next.delete("page")
    const qs = next.toString()
    startTransition(() => {
      router.replace(qs ? `/super-admin/tenants?${qs}` : "/super-admin/tenants")
    })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, slug, owner email…"
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Hapus pencarian"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <select
        value={status}
        onChange={(e) => changeStatus(e.target.value)}
        className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
