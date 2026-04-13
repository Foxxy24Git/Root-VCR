"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Zap } from "lucide-react"

export interface ProfileInput {
  id?: string
  name: string
  duration_days: number
  duration_hours: number
  price: number
  speed_limit: string
  mikrotik_profile: string
}

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: ProfileInput | null
  onSuccess?: () => void
}

export function ProfileModal({ open, onOpenChange, initialData, onSuccess }: ProfileModalProps) {
  const [formData, setFormData] = useState<ProfileInput>({
    name: "",
    duration_days: 1,
    duration_hours: 0,
    price: 5000,
    speed_limit: "2M/2M",
    mikrotik_profile: "default"
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData && open) {
      setFormData(initialData)
    } else if (!open && !initialData) {
      setFormData({
        name: "",
        duration_days: 1,
        duration_hours: 0,
        price: 5000,
        speed_limit: "2M/2M",
        mikrotik_profile: "default"
      })
    }
  }, [initialData, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? Number(value) : value 
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
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.issues) {
          throw new Error(Object.values(data.issues)[0] as string)
        }
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !loading && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            {initialData ? "Edit Profile Voucher" : "Tambah Profile Voucher"}
          </DialogTitle>
          <DialogDescription>
            Konfigurasi paket voucher untuk disinkronisasikan sebagai User Profile MikroTik.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">Nama Profile / Nama Paket</label>
            <input
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Contoh: Paket 1 Hari 3M"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Harga (Base Price)</label>
              <div className="flex bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                <span className="flex items-center px-3 bg-slate-100 text-slate-500 font-medium border-r border-slate-200 uppercase text-xs">Rp</span>
                <input
                  name="price"
                  type="number"
                  min={0}
                  required
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
                  placeholder="3000"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">MikroTik Profile ID</label>
              <input
                name="mikrotik_profile"
                required
                value={formData.mikrotik_profile}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="default / 3M-1D"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Masa Aktif (Hari)</label>
              <input
                name="duration_days"
                type="number"
                min={0}
                required
                value={formData.duration_days}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Masa Aktif (Jam)</label>
              <input
                name="duration_hours"
                type="number"
                min={0}
                max={23}
                required
                value={formData.duration_hours}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Speed Limit (Rate Limit)</label>
              <input
                name="speed_limit"
                value={formData.speed_limit}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Misal: 2M/2M"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
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
