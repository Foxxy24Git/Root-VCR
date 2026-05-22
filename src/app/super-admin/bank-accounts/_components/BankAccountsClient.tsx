"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Receipt,
  Copy,
  Landmark,
} from "lucide-react"
import { BankAccountFormModal } from "./BankAccountFormModal"

export interface BankAccountRow {
  id: string
  bank_name: string
  account_number: string
  account_holder: string
  notes: string | null
  is_active: boolean
  display_order: number
}

interface Props {
  initialAccounts: BankAccountRow[]
}

export function BankAccountsClient({ initialAccounts }: Props) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<BankAccountRow[]>(initialAccounts)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BankAccountRow | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(account: BankAccountRow) {
    setEditing(account)
    setModalOpen(true)
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= accounts.length) return

    const next = [...accounts]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setAccounts(next)
    setReordering(true)

    try {
      const res = await fetch("/api/super-admin/bank-accounts/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: next.map((a) => a.id) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data?.message ?? "Gagal mengubah urutan")
        setAccounts(accounts) // revert
        return
      }
      router.refresh()
    } finally {
      setReordering(false)
    }
  }

  async function toggleActive(account: BankAccountRow) {
    setBusy(account.id)
    try {
      const res = await fetch(`/api/super-admin/bank-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !account.is_active }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data?.message ?? "Gagal mengubah status")
        return
      }
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === account.id ? { ...a, is_active: !a.is_active } : a,
        ),
      )
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(account: BankAccountRow) {
    if (!confirm(`Hapus rekening "${account.bank_name} — ${account.account_number}"?`)) {
      return
    }
    setBusy(account.id)
    try {
      const res = await fetch(`/api/super-admin/bank-accounts/${account.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data?.message ?? "Gagal menghapus rekening")
        return
      }
      setAccounts((prev) => prev.filter((a) => a.id !== account.id))
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const activeAccounts = accounts.filter((a) => a.is_active)

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => setShowPreview((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40"
        >
          {showPreview ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          {showPreview ? "Sembunyikan Preview" : "Tampilkan Preview"}
        </button>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Rekening
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className={"space-y-3 " + (showPreview ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Semua Rekening
            </h2>
            {reordering && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Menyimpan urutan…
              </span>
            )}
          </div>

          {accounts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
              <Landmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Belum ada rekening. Tambahkan rekening tujuan transfer.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {accounts.map((a, idx) => (
                <li
                  key={a.id}
                  className={
                    "bg-white dark:bg-slate-800 rounded-2xl border shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3 " +
                    (a.is_active
                      ? "border-slate-100 dark:border-slate-700"
                      : "border-slate-100 dark:border-slate-700 opacity-60")
                  }
                >
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0 || reordering}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Pindah naik"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === accounts.length - 1 || reordering}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Pindah turun"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bank icon */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {a.bank_name.slice(0, 4).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {a.bank_name}
                      </p>
                      {!a.is_active && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[9px] font-semibold uppercase">
                          Non-aktif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                      {a.account_number}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      a/n {a.account_holder}
                    </p>
                    {a.notes && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
                        {a.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(a)}
                      disabled={busy === a.id}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 disabled:opacity-50"
                      aria-label={a.is_active ? "Nonaktifkan" : "Aktifkan"}
                      title={a.is_active ? "Nonaktifkan" : "Aktifkan"}
                    >
                      {busy === a.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : a.is_active ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(a)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                      aria-label="Edit"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
                      disabled={busy === a.id}
                      className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                      aria-label="Hapus"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Preview (Sisi Customer)
              </h2>
              <CustomerPreview accounts={activeAccounts} />
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <BankAccountFormModal
          account={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

function CustomerPreview({ accounts }: { accounts: BankAccountRow[] }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-slate-100 shadow-xl border border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="w-4 h-4 text-emerald-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Transfer ke salah satu rekening
        </p>
      </div>

      {accounts.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">
          Belum ada rekening aktif. Customer tidak akan melihat opsi transfer.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {accounts.map((a) => (
            <li
              key={a.id}
              className="bg-white/5 rounded-xl p-3 border border-white/10"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-300">
                  {a.bank_name}
                </p>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                  Salin
                </span>
              </div>
              <p className="font-mono text-sm text-white mt-1 select-all">
                {a.account_number}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                a/n {a.account_holder}
              </p>
              {a.notes && (
                <p className="text-[10px] text-slate-500 mt-1">{a.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[10px] text-slate-500 text-center">
        Setelah transfer, upload bukti di halaman invoice.
      </p>
    </div>
  )
}

// Re-export unused icon to avoid tree-shake warning in some setups
export { Copy }
