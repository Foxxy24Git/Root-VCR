"use client"

import * as React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, UserPlus } from "lucide-react"

interface AddResellerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddResellerModal({ open, onOpenChange, onSuccess }: AddResellerModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    fee_percentage: 10
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'fee_percentage' ? Number(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.issues) {
          const firstError = Object.values(data.issues)[0] as string[]
          throw new Error(firstError[0] || "Validasi gagal")
        }
        throw new Error(data.message || "Gagal membuat reseller")
      }

      onSuccess?.()
      onOpenChange(false)
      setFormData({ name: "", email: "", password: "", phone: "", fee_percentage: 10 })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors"

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !loading && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Tambah Reseller Baru
          </DialogTitle>
          <DialogDescription>
            Buat akun reseller baru. Wallet akan dibuatkan otomatis.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-100 dark:border-red-800/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nama Lengkap</label>
              <input
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className={inputCls}
                placeholder="Ahmad Yusuf"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={inputCls}
                placeholder="ahmad@rootvcr.com"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className={inputCls}
                placeholder="••••••••"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">No. WhatsApp</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={inputCls}
                placeholder="08123456789"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Fee Percentage (Diskon %)</label>
              <div className="flex bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 overflow-hidden">
                <input
                  name="fee_percentage"
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={formData.fee_percentage}
                  onChange={handleChange}
                  className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
                  placeholder="10"
                />
                <span className="flex items-center px-3 bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 font-medium border-l border-slate-200 dark:border-slate-600">
                  %
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ini adalah persentase diskon dari harga normal profile.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Reseller
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
