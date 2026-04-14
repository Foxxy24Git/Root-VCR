"use client"

import * as React from "react"
import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { AddResellerModal } from "@/components/modals/AddResellerModal"
import { TopupModal } from "@/components/modals/TopupModal"
import {
  UserPlus, Search, Snowflake, Pencil, Wallet,
  CheckCircle2, XCircle, Loader2, Camera, Eye, EyeOff
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import Image from "next/image"

interface Reseller {
  id: string
  name: string
  email: string
  phone: string | null
  fee_percentage: number
  is_active: boolean
  is_frozen: boolean
  created_at: string
  balance: number
  total_spent: number
  avatar_url?: string | null
}

interface ResellerManagementProps {
  resellers: Reseller[]
}

// ── Edit Reseller Dialog ──────────────────────────────────────────────────────

function EditResellerDialog({
  open,
  onOpenChange,
  reseller,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  reseller: Reseller | null
  onSuccess: () => void
}) {
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    fee_percentage: 0,
    password: "",
    avatar_url: "" as string | null,
  })
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [showPassword, setShowPassword] = React.useState(false)
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null)
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (reseller && open) {
      setFormData({
        name: reseller.name,
        email: reseller.email,
        phone: reseller.phone ?? "",
        fee_percentage: reseller.fee_percentage,
        password: "",
        avatar_url: reseller.avatar_url ?? null,
      })
      setAvatarPreview(reseller.avatar_url ?? null)
      setAvatarFile(null)
      setError(null)
      setShowPassword(false)
    }
  }, [reseller, open])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reseller) return
    setLoading(true)
    setError(null)

    try {
      let avatar_url = formData.avatar_url

      // Upload avatar if a new file was picked
      if (avatarFile) {
        const fd = new FormData()
        fd.append("file", avatarFile)
        fd.append("userId", reseller.id)
        const uploadRes = await fetch("/api/upload/avatar", { method: "POST", body: fd })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadData.message || "Gagal upload avatar")
        avatar_url = uploadData.url
      }

      const body: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        fee_percentage: formData.fee_percentage,
        avatar_url,
      }
      if (formData.password) body.password = formData.password

      const res = await fetch(`/api/users/${reseller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Gagal memperbarui reseller")
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  const initials = reseller?.name.charAt(0).toUpperCase() ?? "?"

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-600" />
            Edit Reseller
          </DialogTitle>
          <DialogDescription>Ubah informasi reseller: {reseller?.name}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar"
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-slate-600" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="text-xs text-slate-500">
              <p className="font-medium text-slate-700">Foto Profil</p>
              <p>JPG, PNG, WebP — maks 2MB</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">Nama Lengkap</label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">No. WhatsApp</label>
            <input
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              placeholder="08123456789"
            />
          </div>

          {/* Fee */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">Fee Percentage (%)</label>
            <div className="flex bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20">
              <input
                type="number"
                min={0}
                max={100}
                required
                value={formData.fee_percentage}
                onChange={(e) => setFormData((p) => ({ ...p, fee_percentage: Number(e.target.value) }))}
                className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
              />
              <span className="flex items-center px-3 bg-slate-100 text-slate-500 font-medium border-l border-slate-200">%</span>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">
              Password Baru <span className="text-slate-400 font-normal">(kosongkan jika tidak diubah)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                placeholder="Minimal 6 karakter"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ResellerManagement({ resellers: initialResellers }: ResellerManagementProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "frozen">("all")

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [topupOpen, setTopupOpen] = useState(false)
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null)
  const [freezeLoading, setFreezeLoading] = useState<string | null>(null)

  const filtered = initialResellers.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && !r.is_frozen && r.is_active) ||
      (filterStatus === "frozen" && r.is_frozen)
    return matchSearch && matchStatus
  })

  const refresh = () => startTransition(() => router.refresh())

  const handleFreezeToggle = async (reseller: Reseller) => {
    setFreezeLoading(reseller.id)
    try {
      const res = await fetch(`/api/users/${reseller.id}/freeze`, { method: "PATCH" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Gagal mengubah status")
      }
      refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengubah status reseller")
    } finally {
      setFreezeLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="frozen">Frozen</option>
          </select>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Reseller
        </button>
      </div>

      {/* Desktop Table */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Reseller</th>
                <th className="px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs">Fee</th>
                <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-xs">Saldo</th>
                <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-xs">Omset</th>
                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-xs">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-500">
                    <Search className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                    <p className="font-medium text-slate-900">Tidak ada reseller</p>
                    <p className="text-sm mt-1">Coba ubah filter atau tambah reseller baru.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {r.avatar_url ? (
                          <Image
                            src={r.avatar_url}
                            alt={r.name}
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{r.name}</p>
                          <p className="text-xs text-slate-500">{r.email}</p>
                          {r.phone && <p className="text-xs text-slate-400">{r.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{r.fee_percentage}%</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      Rp {r.balance.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700">
                      Rp {r.total_spent.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        r.is_frozen
                          ? "bg-blue-100 text-blue-700"
                          : r.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {r.is_frozen ? (
                          <><Snowflake className="w-3 h-3" />Frozen</>
                        ) : r.is_active ? (
                          <><CheckCircle2 className="w-3 h-3" />Aktif</>
                        ) : (
                          <><XCircle className="w-3 h-3" />Nonaktif</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedReseller(r); setTopupOpen(true) }}
                          title="Top Up Saldo"
                          disabled={r.is_frozen}
                          className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Wallet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedReseller(r); setEditOpen(true) }}
                          title="Edit"
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleFreezeToggle(r)}
                          disabled={freezeLoading === r.id}
                          title={r.is_frozen ? "Unfreeze" : "Freeze"}
                          className={`p-2 rounded-lg transition-colors ${
                            r.is_frozen
                              ? "hover:bg-green-50 text-green-600"
                              : "hover:bg-blue-50 text-blue-600"
                          }`}
                        >
                          {freezeLoading === r.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Snowflake className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 px-4">
              <Search className="w-8 h-8 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-900">Tidak ada reseller</p>
            </div>
          ) : (
            filtered.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {r.avatar_url ? (
                      <Image
                        src={r.avatar_url}
                        alt={r.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shrink-0">
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    r.is_frozen ? "bg-blue-100 text-blue-700" : r.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {r.is_frozen ? "Frozen" : r.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-slate-400 mb-0.5">Fee</p>
                    <p className="font-bold text-slate-900">{r.fee_percentage}%</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-slate-400 mb-0.5">Saldo</p>
                    <p className="font-bold text-slate-900">Rp {r.balance.toLocaleString("id-ID")}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-slate-400 mb-0.5">Omset</p>
                    <p className="font-bold text-slate-900">Rp {r.total_spent.toLocaleString("id-ID")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelectedReseller(r); setTopupOpen(true) }}
                    disabled={r.is_frozen}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Wallet className="w-3.5 h-3.5" /> Top Up
                  </button>
                  <button
                    onClick={() => { setSelectedReseller(r); setEditOpen(true) }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleFreezeToggle(r)}
                    disabled={freezeLoading === r.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold disabled:opacity-50"
                  >
                    {freezeLoading === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Snowflake className="w-3.5 h-3.5" />}
                    {r.is_frozen ? "Unfreeze" : "Freeze"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <AddResellerModal open={addOpen} onOpenChange={setAddOpen} onSuccess={refresh} />
      <EditResellerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        reseller={selectedReseller}
        onSuccess={refresh}
      />
      <TopupModal
        open={topupOpen}
        onOpenChange={setTopupOpen}
        reseller={selectedReseller ? {
          id: selectedReseller.id,
          name: selectedReseller.name,
          email: selectedReseller.email,
          balance: selectedReseller.balance,
        } : null}
        onSuccess={refresh}
      />
    </div>
  )
}
