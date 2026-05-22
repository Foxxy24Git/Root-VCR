"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  User,
  Mail,
  Phone,
  Router,
  Hash,
  KeyRound,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

export interface InitialValues {
  name: string
  owner_name: string
  owner_email: string
  owner_phone: string
  mikrotik_host: string
  mikrotik_port: number
  mikrotik_username: string
  mikrotik_use_ssl: boolean
  max_resellers: number
  max_vouchers_per_month: number
}

type FieldErrors = Record<string, string[] | undefined>

export function EditTenantForm({
  tenantId,
  initial,
}: {
  tenantId: string
  initial: InitialValues
}) {
  const router = useRouter()
  const [v, setV] = useState(initial)
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [topError, setTopError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function set<K extends keyof InitialValues>(key: K, value: InitialValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTopError(null)
    setSuccess(false)
    setFieldErrors({})

    const payload: Record<string, unknown> = {
      name: v.name,
      owner_name: v.owner_name,
      owner_email: v.owner_email,
      owner_phone: v.owner_phone,
      mikrotik_host: v.mikrotik_host,
      mikrotik_port: v.mikrotik_port,
      mikrotik_username: v.mikrotik_username,
      mikrotik_use_ssl: v.mikrotik_use_ssl,
      max_resellers: v.max_resellers,
      max_vouchers_per_month: v.max_vouchers_per_month,
    }
    if (newPassword.trim()) payload.mikrotik_password = newPassword

    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data?.issues) {
          setFieldErrors(data.issues as FieldErrors)
          setTopError("Periksa kembali field yang ditandai merah.")
        } else {
          setTopError(data?.message ?? "Gagal menyimpan perubahan")
        }
        return
      }
      setSuccess(true)
      setNewPassword("")
      router.refresh()
    } catch {
      setTopError("Network error. Coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {topError && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {topError}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          Perubahan tersimpan.
        </div>
      )}

      {/* Data Customer */}
      <Section title="Data Customer" icon={Building2}>
        <Field label="Nama Tenant" error={fieldErrors.name}>
          <Input
            icon={Building2}
            value={v.name}
            onChange={(val) => set("name", val)}
            required
          />
        </Field>
        <Field label="Nama Owner" error={fieldErrors.owner_name}>
          <Input
            icon={User}
            value={v.owner_name}
            onChange={(val) => set("owner_name", val)}
            required
          />
        </Field>
        <Field label="Email Owner" error={fieldErrors.owner_email}>
          <Input
            icon={Mail}
            type="email"
            value={v.owner_email}
            onChange={(val) => set("owner_email", val)}
            required
          />
        </Field>
        <Field label="No. HP Owner" error={fieldErrors.owner_phone}>
          <Input
            icon={Phone}
            value={v.owner_phone}
            onChange={(val) => set("owner_phone", val)}
            required
          />
        </Field>
      </Section>

      {/* MikroTik */}
      <Section title="MikroTik Configuration" icon={Router}>
        <Field label="Host / IP" error={fieldErrors.mikrotik_host}>
          <Input
            icon={Router}
            value={v.mikrotik_host}
            onChange={(val) => set("mikrotik_host", val)}
            required
          />
        </Field>
        <Field label="Port" error={fieldErrors.mikrotik_port}>
          <Input
            icon={Hash}
            type="number"
            value={String(v.mikrotik_port)}
            onChange={(val) => set("mikrotik_port", parseInt(val) || 0)}
            required
          />
        </Field>
        <Field label="Username" error={fieldErrors.mikrotik_username}>
          <Input
            icon={User}
            value={v.mikrotik_username}
            onChange={(val) => set("mikrotik_username", val)}
            required
          />
        </Field>
        <Field
          label="Password Baru"
          error={fieldErrors.mikrotik_password}
          hint="Kosongkan jika tidak ingin mengubah password"
        >
          <Input
            icon={KeyRound}
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="••••••••"
          />
        </Field>

        <div className="md:col-span-2 flex items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Gunakan SSL/TLS
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Port 8729 untuk API-SSL.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={v.mikrotik_use_ssl}
              onChange={(e) => set("mikrotik_use_ssl", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-cyan-400 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
          </label>
        </div>
      </Section>

      {/* Limits */}
      <Section title="Limit Override" icon={ShieldCheck}>
        <Field label="Max Reseller" error={fieldErrors.max_resellers}>
          <Input
            icon={User}
            type="number"
            value={String(v.max_resellers)}
            onChange={(val) => set("max_resellers", parseInt(val) || 0)}
            required
          />
        </Field>
        <Field
          label="Max Voucher / Bulan"
          error={fieldErrors.max_vouchers_per_month}
        >
          <Input
            icon={Hash}
            type="number"
            value={String(v.max_vouchers_per_month)}
            onChange={(val) =>
              set("max_vouchers_per_month", parseInt(val) || 0)
            }
            required
          />
        </Field>
      </Section>

      <div className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur -mx-4 lg:-mx-6 px-4 lg:px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
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
              <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> Simpan Perubahan
            </>
          )}
        </button>
      </div>
    </form>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string[]
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

function Input({
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
          "w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
          (Icon ? "pl-10 pr-3" : "px-3")
        }
      />
    </div>
  )
}
