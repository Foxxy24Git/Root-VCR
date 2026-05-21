"use client"

import * as React from "react"
import { useState, useTransition, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ProfileModal, ProfileInput } from "@/components/modals/ProfileModal"
import { VoucherDetailModal, VoucherDetail } from "@/components/modals/VoucherDetailModal"
import {
  Zap, List, Wifi, Plus, RefreshCw,
  Pencil, Trash2, Loader2, Search, Filter,
  CheckCircle2, XCircle, FileDown, FileText
} from "lucide-react"
import Link from "next/link"

interface Profile {
  id: string
  name: string
  duration_days: number
  duration_hours: number
  price: number
  speed_limit: string | null
  mikrotik_profile: string
  is_active: boolean
}

interface Voucher {
  id: string
  code: string
  profile_name: string | null
  user_name: string | null
  status: string
  generated_at: string
  used_at: string | null
  expired_at: string | null
  client_ip: string | null
  client_mac: string | null
  price_charged: number
  password?: string | null
}

interface PppoeUserStatus {
  name: string
  profile: string
  service: string
  status: "online" | "offline"
  caller_id: string | null
  address: string | null
  uptime: string | null
}

interface PppoeApiResponse {
  total: number
  online: number
  offline: number
  users: PppoeUserStatus[]
}

interface VoucherAdminTabsProps {
  profiles: Profile[]
  vouchers: Voucher[]
  totalVouchers: number
  currentPage: number
  searchFilter?: string
  statusFilter?: string
  profileFilter?: string
  initialTab?: "profiles" | "vouchers" | "pppoe"
}

// ── Profile Management Tab ───────────────────────────────────────────────────

function ProfileManagement({ initialProfiles }: { initialProfiles: Profile[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [editProfile, setEditProfile] = useState<ProfileInput | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const refresh = () => startTransition(() => router.refresh())

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch("/api/mikrotik/sync", { method: "POST" })
      const data = await res.json()
      setSyncMsg(res.ok ? data.message : (data.message || "Sync gagal"))
      if (res.ok) refresh()
    } catch {
      setSyncMsg("Gagal terhubung ke server")
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (profile: Profile) => {
    if (!confirm(`Hapus profile "${profile.name}"? Voucher yang sudah dibuat tetap ada.`)) return
    setDeletingId(profile.id)
    try {
      console.log("DELETE REQUEST ID:", profile.id, "mikrotik_profile:", profile.mikrotik_profile)

      // Delete from DB
      const dbRes = await fetch(`/api/profiles/${profile.id}`, { method: "DELETE" })
      if (!dbRes.ok) {
        const data = await dbRes.json()
        throw new Error(data.error || "Gagal menghapus dari database")
      }

      // Delete from MikroTik (best-effort, non-blocking on error)
      try {
        const mtRes = await fetch(
          `/api/mikrotik/profiles?profileId=${encodeURIComponent(profile.mikrotik_profile)}`,
          { method: "DELETE" }
        )
        console.log("MIKROTIK DELETE STATUS:", mtRes.status)
      } catch (mtErr) {
        console.warn("MikroTik delete warning:", mtErr)
      }

      // Remove from local state immediately — no router.refresh()
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus profile")
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (profile: Profile) => {
    try {
      await fetch(`/api/profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !profile.is_active }),
      })
      refresh()
    } catch {
      alert("Gagal mengubah status profile")
    }
  }

  const openEdit = (p: Profile) => {
    setEditProfile({
      id: p.id,
      name: p.name,
      duration_days: p.duration_days,
      duration_hours: p.duration_hours,
      price: p.price,
      speed_limit: p.speed_limit ?? "",
      mikrotik_profile: p.mikrotik_profile,
    })
    setProfileModalOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          <button
            onClick={() => { setEditProfile(null); setProfileModalOpen(true) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Profile
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Sync MikroTik
          </button>
        </div>
        {syncMsg && (
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/30 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600">{syncMsg}</p>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-200">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Nama Profile</th>
                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-xs">Durasi</th>
                <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-xs">Harga</th>
                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-xs">Speed</th>
                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-xs">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Zap className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="font-medium text-slate-900 dark:text-slate-100">Belum ada profile</p>
                  </td>
                </tr>
              ) : (
                profiles.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{p.mikrotik_profile}</p>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700 dark:text-slate-300">
                      {p.duration_days > 0 ? `${p.duration_days}h ` : ""}
                      {p.duration_hours > 0 ? `${p.duration_hours}j` : ""}
                      {p.duration_days === 0 && p.duration_hours === 0 ? "-" : ""}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">
                      Rp {p.price.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">{p.speed_limit || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleToggleActive(p)} className="inline-flex items-center gap-1.5">
                        {p.is_active ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="w-3 h-3" />Aktif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                            <XCircle className="w-3 h-3" />Nonaktif
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p.id}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg disabled:opacity-50"
                        >
                          {deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
          {profiles.map(p => (
            <div key={p.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{p.mikrotik_profile} • {p.speed_limit || "no limit"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                  {p.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="text-sm">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Rp {p.price.toLocaleString("id-ID")}</span>
                  <span className="text-slate-400 dark:text-slate-500 text-xs ml-2">{p.duration_days}h {p.duration_hours}j</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(p)} className="p-1.5 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        initialData={editProfile}
        onSuccess={refresh}
      />
    </div>
  )
}

// ── All Vouchers Tab ─────────────────────────────────────────────────────────

function AllVouchers({
  vouchers,
  totalVouchers,
  currentPage,
  profiles,
  searchFilter,
  statusFilter,
  profileFilter,
}: {
  vouchers: Voucher[]
  totalVouchers: number
  currentPage: number
  profiles: Profile[]
  searchFilter?: string
  statusFilter?: string
  profileFilter?: string
}) {
  const limit = 20
  const totalPages = Math.ceil(totalVouchers / limit)
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null)
  const [syncing, setSyncing] = useState(false)

  const syncAndRefresh = useCallback(async () => {
    setSyncing(true)
    try {
      await fetch("/api/mikrotik/sync-vouchers", { method: "POST" })
      startTransition(() => router.refresh())
    } catch (e) {
      console.error("[AllVouchers] sync error:", e)
    } finally {
      setSyncing(false)
    }
  }, [router, startTransition])

  // Sync on mount, auto-refresh DB every 30s
  useEffect(() => {
    syncAndRefresh()
    const interval = setInterval(() => startTransition(() => router.refresh()), 30_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({
      tab: "vouchers",
      page: String(currentPage),
      status: statusFilter || "",
      search: searchFilter || "",
      profileId: profileFilter || "",
      ...overrides,
    })
    return `?${params.toString()}`
  }

  const openDetail = (v: Voucher) => {
    setSelectedVoucher({
      id: v.id,
      code: v.code,
      profile: v.profile_name,
      user_name: v.user_name,
      generated_at: v.generated_at,
      used_at: v.used_at,
      expired_at: v.expired_at,
      status: v.status,
      client_ip: v.client_ip,
      client_mac: v.client_mac,
      price_charged: v.price_charged,
      password: v.password,
    })
    setDetailOpen(true)
  }

  const handleExport = async (format: "excel" | "pdf") => {
    setExporting(format)
    try {
      const res = await fetch(`/api/vouchers/export?format=${format}`)
      if (!res.ok) throw new Error("Export gagal")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `vouchers-${Date.now()}.${format === "excel" ? "xlsx" : "pdf"}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert("Gagal mengekspor data")
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-200">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
          <form className="flex flex-col gap-3" method="GET">
            <input type="hidden" name="tab" value="vouchers" />
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={searchFilter}
                placeholder="Cari kode atau reseller..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select name="status" defaultValue={statusFilter || "all"} className="flex-1 min-w-[130px] bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm cursor-pointer">
                <option value="all">Semua Status</option>
                <option value="unused">Unused</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
                <option value="deleted">Deleted</option>
              </select>
              <select name="profileId" defaultValue={profileFilter || "all"} className="flex-1 min-w-[130px] bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm cursor-pointer">
                <option value="all">Semua Profile</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button type="submit" className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 dark:hover:bg-white shrink-0">Filter</button>
              <div className="flex gap-2 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={syncAndRefresh}
                  disabled={syncing}
                  className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">{syncing ? "Syncing..." : "Sync Status"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  disabled={exporting === "pdf"}
                  className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {exporting === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("excel")}
                  disabled={exporting === "excel"}
                  className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/40 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {exporting === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  <span className="hidden sm:inline">Excel</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Kode Voucher</th>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Reseller</th>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Profile</th>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Generated</th>
                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Client IP</th>
                <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-xs">Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-slate-500 dark:text-slate-400">
                    <Filter className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="font-medium text-slate-900 dark:text-slate-100">Tidak ada voucher</p>
                  </td>
                </tr>
              ) : (
                vouchers.map(v => (
                  <tr
                    key={v.id}
                    className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                    onClick={() => openDetail(v)}
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 tracking-wider">{v.code}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{v.user_name ?? "-"}</td>
                    <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400">{v.profile_name ?? "-"}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {new Date(v.generated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        v.status === "active"   ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        v.status === "inactive" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        v.status === "unused"   ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        v.status === "expired"  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                      }`}>
                        {v.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {v.client_ip ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-slate-100">
                      Rp {v.price_charged.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
          {vouchers.map(v => (
            <div key={v.id} className="p-4 cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/10" onClick={() => openDetail(v)}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 tracking-wider">{v.code}</span>
                  <p className="text-xs text-blue-600 dark:text-blue-400">{v.profile_name ?? "-"} • {v.user_name ?? "-"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  v.status === "active"   ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                  v.status === "inactive" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                  v.status === "unused"   ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                  v.status === "expired"  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                  "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                }`}>{v.status.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span>{new Date(v.generated_at).toLocaleDateString("id-ID")}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">Rp {v.price_charged.toLocaleString("id-ID")}</span>
              </div>
              {v.client_ip && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">IP: {v.client_ip}</p>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/20 text-sm">
            <span className="text-slate-500">
              Hal. {currentPage} dari {totalPages} ({totalVouchers} total)
            </span>
            <div className="flex gap-1">
              <Link href={buildHref({ page: String(Math.max(1, currentPage - 1)) })}
                className={`px-3 py-1.5 border rounded-md font-medium ${currentPage <= 1 ? "pointer-events-none opacity-50 border-slate-200 dark:border-slate-700 text-slate-400" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"}`}>
                Prev
              </Link>
              <Link href={buildHref({ page: String(Math.min(totalPages, currentPage + 1)) })}
                className={`px-3 py-1.5 border rounded-md font-medium ${currentPage >= totalPages ? "pointer-events-none opacity-50 border-slate-200 dark:border-slate-700 text-slate-400" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"}`}>
                Next
              </Link>
            </div>
          </div>
        )}
      </div>

      <VoucherDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        voucher={selectedVoucher}
        onActionSuccess={() => startTransition(() => router.refresh())}
        isAdmin={true}
      />
    </div>
  )
}

// ── PPPoE Management Tab ─────────────────────────────────────────────────────

function PppoeStatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: "default" | "online" | "offline"
}) {
  const accent =
    tone === "online"
      ? "text-green-600 dark:text-green-400"
      : tone === "offline"
      ? "text-slate-500 dark:text-slate-400"
      : "text-slate-900 dark:text-slate-100"
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

function PppoeManagement() {
  const [data, setData] = useState<PppoeApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setRefreshing(true)
    try {
      const res = await fetch("/api/mikrotik/pppoe", { cache: "no-store" })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.message || `Gagal memuat data (${res.status})`)
      }
      const json = (await res.json()) as PppoeApiResponse
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data PPPoE")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData(false)
    const id = setInterval(() => fetchData(false), 30_000)
    return () => clearInterval(id)
  }, [fetchData])

  const users = data?.users ?? []
  const total = data?.total ?? 0
  const online = data?.online ?? 0
  const offline = data?.offline ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">Data user PPPoE real-time dari MikroTik. Auto-refresh tiap 30 detik.</p>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <PppoeStatCard label="Total Users" value={loading && !data ? "—" : total} tone="default" />
        <PppoeStatCard label="Online" value={loading && !data ? "—" : online} tone="online" />
        <PppoeStatCard label="Offline" value={loading && !data ? "—" : offline} tone="offline" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-200">
        {loading && !data ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400 px-4">
            <Wifi className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-medium text-slate-900 dark:text-slate-100">Tidak ada user PPPoE</p>
            <p className="text-sm mt-1">Belum ada user PPPoE terdaftar di MikroTik.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Username</th>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Profile</th>
                    <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-xs">Status</th>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">IP Address</th>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Uptime</th>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Caller ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {users.map(u => (
                    <tr key={u.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{u.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{u.profile || "-"}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.status === "online"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === "online" ? "bg-green-500" : "bg-slate-400"}`} />
                          {u.status === "online" ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{u.address || "-"}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">{u.uptime || "-"}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{u.caller_id || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
              {users.map(u => (
                <div key={u.name} className="p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{u.name}</p>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.status === "online"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === "online" ? "bg-green-500" : "bg-slate-400"}`} />
                      {u.status === "online" ? "Online" : "Offline"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Profile: {u.profile || "-"}</p>
                  {u.status === "online" && (
                    <div className="mt-1.5 grid grid-cols-2 gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <p>IP: <span className="font-mono">{u.address || "-"}</span></p>
                      <p>Uptime: {u.uptime || "-"}</p>
                      <p className="col-span-2">Caller: <span className="font-mono">{u.caller_id || "-"}</span></p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Tabbed Component ────────────────────────────────────────────────────

export function VoucherAdminTabs({
  profiles,
  vouchers,
  totalVouchers,
  currentPage,
  searchFilter,
  statusFilter,
  profileFilter,
  initialTab = "vouchers",
}: VoucherAdminTabsProps) {
  const [activeTab, setActiveTab] = useState<"profiles" | "vouchers" | "pppoe">(initialTab)

  const tabs = [
    { id: "profiles", label: "Profile Management", icon: <Zap className="w-4 h-4" /> },
    { id: "vouchers", label: "Semua Voucher", icon: <List className="w-4 h-4" /> },
    { id: "pppoe", label: "PPPoE", icon: <Wifi className="w-4 h-4" /> },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-none justify-center sm:justify-start ${
              activeTab === tab.id
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "profiles" && <ProfileManagement initialProfiles={profiles} />}
      {activeTab === "vouchers" && (
        <AllVouchers
          vouchers={vouchers}
          totalVouchers={totalVouchers}
          currentPage={currentPage}
          profiles={profiles}
          searchFilter={searchFilter}
          statusFilter={statusFilter}
          profileFilter={profileFilter}
        />
      )}
      {activeTab === "pppoe" && <PppoeManagement />}
    </div>
  )
}
