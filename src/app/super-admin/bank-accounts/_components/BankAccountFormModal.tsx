"use client"

import { FormEvent, useEffect, useState } from "react"
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Landmark,
  Hash,
  User,
  StickyNote,
} from "lucide-react"
import type { BankAccountRow } from "./BankAccountsClient"

interface Props {
  account: BankAccountRow | null
  onClose: () => void
  onSaved: () => void
}

interface FieldErrors {
  [key: string]: string[] | undefined
}

const COMMON_BANKS = ["BCA", "Mandiri", "BRI", "BNI", "CIMB", "Dana", "OVO", "GoPay", "ShopeePay"]

export function BankAccountFormModal({ account, onClose, onSaved }: Props) {
  const isEdit = account !== null

  const [bankName, setBankName] = useState(account?.bank_name ?? "")
  const [accountNumber, setAccountNumber] = useState(account?.account_number ?? "")
  const [accountHolder, setAccountHolder] = useState(account?.account_holder ?? "")
  const [notes, setNotes] = useState(account?.notes ?? "")
  const [isActive, setIsActive] = useState(account?.is_active ?? true)

  const [loading, setLoading] = useState(false)
  const [topError, setTopError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [loading, onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTopError(null)
    setFieldErrors({})

    const payload = {
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      account_holder: accountHolder.trim(),
      notes: notes.trim() || null,
      is_active: isActive,
    }

    try {
      const url = isEdit
        ? `/api/super-admin/bank-accounts/${account!.id}`
        : "/api/super-admin/bank-accounts"
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (data?.issues) {
          setFieldErrors(data.issues as FieldErrors)
          setTopError("Periksa field yang ditandai merah.")
        } else {
          setTopError(data?.message ?? "Gagal menyimpan rekening")
        }
        return
      }

      onSaved()
    } catch {
      setTopError("Terjadi kesalahan jaringan. Coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
    >
      <div className="relative flex flex-col w-full sm:max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden">
        <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isEdit ? "Edit Rekening" : "Tambah Rekening"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEdit
                  ? `Update detail ${account!.bank_name}`
                  : "Rekening tujuan transfer untuk customer"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden min-h-0">
          <div className="overflow-y-auto min-h-0 p-6 space-y-4">
          {topError && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{topError}</span>
            </div>
          )}

          <Field label="Nama Bank / E-wallet" error={fieldErrors.bank_name}>
            <TextInput
              icon={Landmark}
              value={bankName}
              onChange={setBankName}
              placeholder="BCA, Mandiri, Dana, dll"
              required
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_BANKS.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setBankName(b)}
                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] text-slate-600 dark:text-slate-400 font-medium"
                >
                  {b}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Nomor Rekening / E-wallet" error={fieldErrors.account_number}>
            <TextInput
              icon={Hash}
              value={accountNumber}
              onChange={setAccountNumber}
              placeholder="1234567890"
              required
            />
          </Field>

          <Field label="Nama Pemilik Rekening" error={fieldErrors.account_holder}>
            <TextInput
              icon={User}
              value={accountHolder}
              onChange={setAccountHolder}
              placeholder="Sesuai buku tabungan"
              required
            />
          </Field>

          <Field
            label="Catatan"
            error={fieldErrors.notes}
            hint="Opsional. Contoh: 'Mohon konfirmasi via WhatsApp setelah transfer'"
          >
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan opsional…"
                rows={2}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </Field>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Aktif
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hanya rekening aktif yang muncul di halaman pembayaran customer.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-cyan-400 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
            </label>
          </div>

          </div>
          <div className="shrink-0 px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/40"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isEdit ? "Simpan Perubahan" : "Tambah Rekening"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string[]
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {children}
      {error?.[0] ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error[0]}</p>
      ) : hint ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

function TextInput({
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
}: {
  icon?: React.ComponentType<{ className?: string }>
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={
          "w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
          (Icon ? "pl-10 pr-3" : "px-3")
        }
      />
    </div>
  )
}
