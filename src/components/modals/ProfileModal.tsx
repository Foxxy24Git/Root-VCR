"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Zap, RefreshCw, CheckCircle2 } from "lucide-react"

export interface ProfileInput {
  id?: string
  name: string
  duration_days: number
  duration_hours: number
  price: number
  speed_limit: string
  mikrotik_profile: string
}

interface MikrotikProfile {
  name: string
  speed_limit: string | null
  duration_days: number
  duration_hours: number
  session_timeout: string | null
}

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: ProfileInput | null
  onSuccess?: () => void
}

const EMPTY: ProfileInput = {
  name: "",
  duration_days: 0,
  duration_hours: 0,
  price: 5000,
  speed_limit: "",
  mikrotik_profile: "",
}

export function ProfileModal({ open, onOpenChange, initialData, onSuccess }: ProfileModalProps) {
  const [formData, setFormData] = useState<ProfileInput>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mtProfiles, setMtProfiles] = useState<MikrotikProfile[]>([])
  const [mtLoading, setMtLoading] = useState(false)
  const [mtError, setMtError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFormData(initialData ?? EMPTY)
      setError(null)
      fetchMtProfiles()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData])

  const fetchMtProfiles = async () => {
    setMtLoading(true)
    setMtError(null)
    try {
      const res = await fetch("/api/mikrotik/profiles", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal mengambil profile")
      setMtProfiles(data.profiles ?? [])
    } catch (e: unknown) {
      setMtError(e instanceof Error ? e.message : "Gagal terhubung ke MikroTik")
    } finally {
      setMtLoading(false)
    }
  }

  const handleMtSelect = (name: string) => {
    const found = mtProfiles.find((p) => p.name === name)
    if (!found) {
      setFormData((prev) => ({ ...prev, mikrotik_profile: name }))
      return
    }
    setFormData((prev) => ({
      ...prev,
      mikrotik_profile: found.name,
      speed_limit: found.speed_limit ?? "",
      duration_days: found.duration_days,
      duration_hours: found.duration_hours,
    }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const isEdit = !!formData.id
    const url = isEdit ? `/api/profiles/${formData.id}` : "/api/profiles"
    const method = isEdit ? "PUT" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.issues) throw new Error(Object.values(data.issues)[0] as string)
        throw new Error(data.message || "Gagal menyimpan profile")
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  const selectedMt = mtProfiles.find((p) => p.name === formData.mikrotik_profile)

  const inputCls = "w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors"

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !loading && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            {initialData ? "Edit Profile Voucher" : "Tambah Profile Voucher"}
          </DialogTitle>
          <DialogDescription>
            Pilih profile dari MikroTik — speed dan durasi diambil otomatis.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-100 dark:border-red-800/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Nama */}
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nama Paket</label>
            <input
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className={inputCls}
              placeholder="Contoh: Paket Harian 3Mbps"
            />
          </div>

          {/* Harga */}
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Harga (Rp)</label>
            <div className="flex bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
              <span className="flex items-center px-3 bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 font-medium border-r border-slate-200 dark:border-slate-600 text-xs uppercase">Rp</span>
              <input
                name="price"
                type="number"
                min={0}
                required
                value={formData.price}
                onChange={handleChange}
                className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
                placeholder="5000"
              />
            </div>
          </div>

          {/* MikroTik Profile */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Profile MikroTik</label>
              <button
                type="button"
                onClick={() => fetchMtProfiles()}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                disabled={mtLoading}
              >
                <RefreshCw className={`w-3 h-3 ${mtLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {mtError && (
              <p className="text-xs text-red-500 dark:text-red-400 mb-1">{mtError} — masukkan nama manual di bawah.</p>
            )}

            {mtProfiles.length > 0 ? (
              <select
                value={formData.mikrotik_profile}
                onChange={(e) => handleMtSelect(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer transition-colors"
                required
              >
                <option value="">-- Pilih Profile --</option>
                {mtProfiles.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                    {p.speed_limit ? ` (${p.speed_limit})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="mikrotik_profile"
                required
                value={formData.mikrotik_profile}
                onChange={handleChange}
                className={inputCls}
                placeholder={mtLoading ? "Mengambil data MikroTik..." : "default / 3M-1D"}
                disabled={mtLoading}
              />
            )}
          </div>

          {/* Auto-filled speed & duration from MikroTik */}
          {selectedMt && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-3">
                <CheckCircle2 className="w-4 h-4" />
                Data otomatis dari MikroTik
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">Speed Limit</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedMt.speed_limit || "No limit"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">Durasi</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedMt.duration_days > 0 ? `${selectedMt.duration_days} hari ` : ""}
                    {selectedMt.duration_hours > 0 ? `${selectedMt.duration_hours} jam` : ""}
                    {selectedMt.duration_days === 0 && selectedMt.duration_hours === 0 ? "Tidak terbatas" : ""}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || mtLoading}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? "Simpan Perubahan" : "Buat Profile"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
