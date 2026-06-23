"use client"

import { FormEvent, useEffect, useState } from "react"
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  Sparkles,
} from "lucide-react"
import { PLAN_FEATURES } from "@/lib/validations/plan"
import type { PlanRow } from "./PlansClient"

interface Props {
  plan: PlanRow | null
  onClose: () => void
  onSaved: () => void
}

interface FieldErrors {
  [key: string]: string[] | undefined
}

export function PlanFormModal({ plan, onClose, onSaved }: Props) {
  const isEdit = plan !== null

  const [name, setName] = useState(plan?.name ?? "")
  const [description, setDescription] = useState(plan?.description ?? "")
  const [price, setPrice] = useState<string>(
    plan ? String(Math.round(Number(plan.price))) : "0",
  )
  const [durationDays, setDurationDays] = useState<string>(
    String(plan?.duration_days ?? 30),
  )
  const [isTrial, setIsTrial] = useState(plan?.is_trial ?? false)
  const [maxResellers, setMaxResellers] = useState<string>(
    String(plan?.max_resellers ?? 5),
  )
  const [maxVouchers, setMaxVouchers] = useState<string>(
    String(plan?.max_vouchers_per_month ?? 1000),
  )
  const [features, setFeatures] = useState<string[]>(plan?.features ?? [])
  const [isActive, setIsActive] = useState(plan?.is_active ?? true)

  const [loading, setLoading] = useState(false)
  const [topError, setTopError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // Close on Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [loading, onClose])

  function toggleFeature(key: string) {
    setFeatures((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTopError(null)
    setFieldErrors({})

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: isTrial ? 0 : Number(price) || 0,
      duration_days: Number(durationDays) || 0,
      is_trial: isTrial,
      max_resellers: Number(maxResellers) || 0,
      max_vouchers_per_month: Number(maxVouchers) || 0,
      features,
      is_active: isActive,
    }

    try {
      const url = isEdit
        ? `/api/super-admin/plans/${plan!.id}`
        : "/api/super-admin/plans"
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
          setTopError(data?.message ?? "Gagal menyimpan plan")
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
      <div className="relative flex flex-col w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isEdit ? "Edit Plan" : "Tambah Plan Baru"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEdit
                  ? `Update detail "${plan!.name}"`
                  : "Buat paket subscription baru"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden min-h-0">
          <div className="overflow-y-auto p-6 space-y-5">
          {topError && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{topError}</span>
            </div>
          )}

          {/* Name + Description */}
          <Field label="Nama Plan" error={fieldErrors.name}>
            <TextInput
              value={name}
              onChange={setName}
              placeholder="Basic / Pro / Enterprise"
              required
            />
          </Field>

          <Field label="Deskripsi" error={fieldErrors.description} hint="opsional">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat plan…"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </Field>

          {/* Trial toggle */}
          <div className="flex items-center justify-between gap-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Plan Trial
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Jika aktif, harga otomatis Rp 0 dan plan dipakai untuk customer baru.
                </p>
              </div>
            </div>
            <Toggle checked={isTrial} onChange={setIsTrial} />
          </div>

          {/* Price + duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Harga (Rp / periode)"
              error={fieldErrors.price}
              hint={isTrial ? "Otomatis 0 (trial)" : "Harga per periode"}
            >
              <TextInput
                type="number"
                value={isTrial ? "0" : price}
                onChange={setPrice}
                placeholder="99000"
                disabled={isTrial}
                required
              />
            </Field>
            <Field
              label="Durasi (hari)"
              error={fieldErrors.duration_days}
            >
              <TextInput
                type="number"
                value={durationDays}
                onChange={setDurationDays}
                placeholder="30"
                required
              />
            </Field>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Max Reseller" error={fieldErrors.max_resellers}>
              <TextInput
                type="number"
                value={maxResellers}
                onChange={setMaxResellers}
                placeholder="5"
                required
              />
            </Field>
            <Field
              label="Max Voucher / bulan"
              error={fieldErrors.max_vouchers_per_month}
            >
              <TextInput
                type="number"
                value={maxVouchers}
                onChange={setMaxVouchers}
                placeholder="1000"
                required
              />
            </Field>
          </div>

          {/* Features multi-select */}
          <Field label="Fitur" error={fieldErrors.features}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PLAN_FEATURES.map((f) => {
                const checked = features.includes(f.key)
                return (
                  <button
                    type="button"
                    key={f.key}
                    onClick={() => toggleFeature(f.key)}
                    className={
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors " +
                      (checked
                        ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600")
                    }
                  >
                    <span
                      className={
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 " +
                        (checked
                          ? "bg-blue-500 border-blue-500"
                          : "border-slate-300 dark:border-slate-600")
                      }
                    >
                      {checked && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </span>
                    <span className="text-xs font-medium">{f.label}</span>
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Active toggle */}
          <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Aktif
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hanya plan aktif yang muncul di form pembuatan tenant.
              </p>
            </div>
            <Toggle checked={isActive} onChange={setIsActive} />
          </div>

          </div>
          {/* Footer */}
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
                  {isEdit ? "Simpan Perubahan" : "Buat Plan"}
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
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
    />
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-cyan-400 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
    </label>
  )
}
