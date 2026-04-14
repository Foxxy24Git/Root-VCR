"use client"

import * as React from "react"
import { useState } from "react"
import { Search, Plus } from "lucide-react"
import { TopupModal, ResellerInfo } from "@/components/modals/TopupModal"
import { useRouter } from "next/navigation"

interface AdminWalletTableProps {
  resellers: {
    id: string
    name: string
    email: string
    balance: number
    total_spent: number
  }[]
}

const idrFmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v)

export function AdminWalletTable({ resellers }: AdminWalletTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedReseller, setSelectedReseller] = useState<ResellerInfo | null>(null)

  const filtered = resellers.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleOpenTopup = (r: ResellerInfo) => {
    setSelectedReseller(r)
    setModalOpen(true)
  }

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari reseller..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Reseller</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Saldo</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Total Omset</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                    Tidak ada reseller ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shrink-0">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{r.name}</p>
                          <p className="text-xs text-slate-500">{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 font-bold text-sm">
                        {idrFmt(r.balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-medium">{idrFmt(r.total_spent)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleOpenTopup(r)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Top Up
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 px-4 italic">
              Tidak ada reseller ditemukan.
            </div>
          ) : (
            filtered.map(r => (
              <div key={r.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shrink-0">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[160px]">{r.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenTopup(r)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors shrink-0"
                  >
                    <Plus className="w-3 h-3" /> Top Up
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-0.5">Saldo</p>
                    <p className="font-bold text-green-700 text-sm">{idrFmt(r.balance)}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-0.5">Total Omset</p>
                    <p className="font-bold text-slate-900 text-sm">{idrFmt(r.total_spent)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TopupModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        reseller={selectedReseller}
        onSuccess={handleSuccess}
      />
    </>
  )
}
