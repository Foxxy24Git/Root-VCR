"use client"

import * as React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, PlusCircle, MinusCircle } from "lucide-react"

export interface ResellerInfo {
  id: string
  name: string
  email: string
  balance: number
}

interface TopupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reseller: ResellerInfo | null
  onSuccess?: () => void
}

export function TopupModal({ open, onOpenChange, reseller, onSuccess }: TopupModalProps) {
  const [amount, setAmount] = useState<number | "">("")
  const [type, setType] = useState<"topup" | "adjustment">("topup")
  const [description, setDescription] = useState("")
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!reseller) return null

  // Prevent unexpected closures during submitting
  const handleOpenChange = (isOpen: boolean) => {
    if (!loading) onOpenChange(isOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
       setError("Jumlah harus lebih dari 0")
       return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/wallets/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: reseller.id, 
          amount: Number(amount), 
          type, 
          description 
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Gagal memproses saldo")

      onSuccess?.()
      onOpenChange(false)
      // Reset
      setAmount("")
      setDescription("")
      setType("topup")
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  const afterBalance = type === "topup" ? reseller.balance + Number(amount) : reseller.balance - Number(amount)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Proses Saldo Reseller</DialogTitle>
          <DialogDescription>
            Atur saldo untuk reseller <b>{reseller.name}</b>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setType("topup")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all ${
                type === "topup" ? "bg-white shadow-sm text-green-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <PlusCircle className="w-4 h-4" /> Top Up (Tambah)
            </button>
            <button
              type="button"
              onClick={() => setType("adjustment")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all ${
                type === "adjustment" ? "bg-white shadow-sm text-red-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <MinusCircle className="w-4 h-4" /> Adjust (Kurangi)
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                Jumlah (Rp)
              </label>
              <input
                type="number"
                min={1}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="100000"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                Keterangan Opsional
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="Misal: Transfer Bank / Koreksi"
              />
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-1 text-sm">
              <div className="flex justify-between items-center text-slate-500">
                <span>Saldo Saat Ini</span>
                <span className="font-medium">Rp {reseller.balance.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-slate-900 pt-1 border-t border-slate-200 mt-1">
                <span>Saldo Setelahnya</span>
                <span className={afterBalance < 0 ? "text-red-500" : "text-green-600"}>
                  Rp {afterBalance.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              disabled={loading || afterBalance < 0}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {type === "topup" ? "Proses Top Up" : "Proses Potongan"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
