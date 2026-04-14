"use client"

import * as React from "react"
import { useState, useTransition } from "react"
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
}

interface PppoeUser {
  id: string
  username: string
  profile: string | null
  status: string
  last_seen: string | null
}

interface VoucherAdminTabsProps {
  profiles: Profile[]
  vouchers: Voucher[]
  totalVouchers: number
  currentPage: number
  pppoeUsers: PppoeUser[]
  searchFilter?: string
  statusFilter?: string
  profileFilter?: string
}

// ── Profile Management Tab ───────────────────────────────────────────────────

function ProfileManagement({ initialProfiles }: { initialProfiles: Profile[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus profile "${name}"? Voucher yang sudah dibuat tetap ada.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Gagal menghapus")
      refresh()
    } catch {
      alert("Gagal menghapus profile")
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
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Sync MikroTik
          </button>
        </div>
        {syncMsg && (
          <p className="text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">{syncMsg}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Nama Profile</th>
                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-xs">Durasi</th>
                <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-xs">Harga</th>
                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-xs">Speed</th>
                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-xs">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Zap className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                    <p className="font-medium text-slate-900">Belum ada profile</p>
                  </td>
                </tr>
              ) : (
                initialProfiles.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.mikrotik_profile}</p>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700">
                      {p.duration_days > 0 ? `${p.duration_days}h ` : ""}
                      {p.duration_hours > 0 ? `${p.duration_hours}j` : ""}
                      {p.duration_days === 0 && p.duration_hours === 0 ? "-" : ""}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      Rp {p.price.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">{p.speed_limit || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleToggleActive(p)} className="inline-flex items-center gap-1.5">
                        {p.is_active ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" />Aktif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                            <XCircle className="w-3 h-3" />Nonaktif
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={deletingId === p.id}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg disabled:opacity-50"
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
        <div className="sm:hidden divide-y divide-slate-100">
          {initialProfiles.map(p => (
            <div key={p.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.mikrotik_profile} • {p.speed_limit || "no limit"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {p.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="text-sm">
                  <span className="font-bold text-slate-900">Rp {p.price.toLocaleString("id-ID")}</span>
                  <span className="text-slate-400 text-xs ml-2">{p.duration_days}h {p.duration_hours}j</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
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
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <form className="flex flex-col gap-3" method="GET">
            <input type="hidden" name="tab" value="vouchers" />
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={searchFilter}
                placeholder="Cari kode atau reseller..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select name="status" defaultValue={statusFilter || "all"} className="flex-1 min-w-[130px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer">
                <option value="all">Semua Status</option>
                <option value="unused">Unused</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="deleted">Deleted</option>
              </select>
              <select name="profileId" defaultValue={profileFilter || "all"} className="flex-1 min-w-[130px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer">
                <option value="all">Semua Profile</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 shrink-0">Filter</button>
              <div className="flex gap-2 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  disabled={exporting === "pdf"}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {exporting === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("excel")}
                  disabled={exporting === "excel"}
                  className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
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
            <thead className="bg-white border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Kode Voucher</th>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Reseller</th>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Profile</th>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Generated</th>
                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-xs">Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-500">
                    <Filter className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                    <p className="font-medium text-slate-900">Tidak ada voucher</p>
                  </td>
                </tr>
              ) : (
                vouchers.map(v => (
                  <tr
                    key={v.id}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onClick={() => openDetail(v)}
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 tracking-wider">{v.code}</td>
                    <td className="px-6 py-4 text-slate-600">{v.user_name ?? "-"}</td>
                    <td className="px-6 py-4 font-medium text-blue-600">{v.profile_name ?? "-"}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(v.generated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        v.status === "active" ? "bg-green-100 text-green-700" :
                        v.status === "unused" ? "bg-yellow-100 text-yellow-700" :
                        v.status === "expired" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {v.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      Rp {v.price_charged.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-slate-100">
          {vouchers.map(v => (
            <div key={v.id} className="p-4 cursor-pointer hover:bg-blue-50/30" onClick={() => openDetail(v)}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-bold text-slate-900 tracking-wider">{v.code}</span>
                  <p className="text-xs text-blue-600">{v.profile_name ?? "-"} • {v.user_name ?? "-"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  v.status === "active" ? "bg-green-100 text-green-700" :
                  v.status === "unused" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>{v.status.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>{new Date(v.generated_at).toLocaleDateString("id-ID")}</span>
                <span className="font-semibold text-slate-900">Rp {v.price_charged.toLocaleString("id-ID")}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30 text-sm">
            <span className="text-slate-500">
              Hal. {currentPage} dari {totalPages} ({totalVouchers} total)
            </span>
            <div className="flex gap-1">
              <Link href={buildHref({ page: String(Math.max(1, currentPage - 1)) })}
                className={`px-3 py-1.5 border rounded-md font-medium ${currentPage <= 1 ? "pointer-events-none opacity-50 border-slate-200 text-slate-400" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"}`}>
                Prev
              </Link>
              <Link href={buildHref({ page: String(Math.min(totalPages, currentPage + 1)) })}
                className={`px-3 py-1.5 border rounded-md font-medium ${currentPage >= totalPages ? "pointer-events-none opacity-50 border-slate-200 text-slate-400" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"}`}>
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
      />
    </div>
  )
}

// ── PPPoE Management Tab ─────────────────────────────────────────────────────

function PppoeManagement({ pppoeUsers }: { pppoeUsers: PppoeUser[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch("/api/mikrotik/sync", { method: "POST" })
      const data = await res.json()
      setSyncMsg(res.ok ? data.message : (data.message || "Sync gagal"))
      if (res.ok) startTransition(() => router.refresh())
    } catch {
      setSyncMsg("Gagal terhubung ke server")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Data user PPPoE dari MikroTik.</p>
        <div className="flex items-center gap-3">
          {syncMsg && <p className="text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">{syncMsg}</p>}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Sync PPPoE
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
        {pppoeUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 px-4">
            <Wifi className="w-8 h-8 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-900">Belum ada data PPPoE</p>
            <p className="text-sm mt-1">Klik Sync PPPoE untuk mengambil data dari MikroTik.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Username</th>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Profile</th>
                    <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-xs">Status</th>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pppoeUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-semibold text-slate-900">{u.username}</td>
                      <td className="px-6 py-4 text-slate-600">{u.profile ?? "-"}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {u.status === "active" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {u.last_seen ? new Date(u.last_seen).toLocaleString("id-ID") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {pppoeUsers.map(u => (
                <div key={u.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-slate-900">{u.username}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {u.status === "active" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {u.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{u.profile ?? "-"}</p>
                  <p className="text-xs text-slate-400 mt-1">{u.last_seen ? new Date(u.last_seen).toLocaleString("id-ID") : "Belum terlihat"}</p>
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
  pppoeUsers,
  searchFilter,
  statusFilter,
  profileFilter,
}: VoucherAdminTabsProps) {
  const [activeTab, setActiveTab] = useState<"profiles" | "vouchers" | "pppoe">("profiles")

  const tabs = [
    { id: "profiles", label: "Profile Management", icon: <Zap className="w-4 h-4" /> },
    { id: "vouchers", label: "Semua Voucher", icon: <List className="w-4 h-4" /> },
    { id: "pppoe", label: "PPPoE", icon: <Wifi className="w-4 h-4" /> },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-none justify-center sm:justify-start ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
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
      {activeTab === "pppoe" && <PppoeManagement pppoeUsers={pppoeUsers} />}
    </div>
  )
}
