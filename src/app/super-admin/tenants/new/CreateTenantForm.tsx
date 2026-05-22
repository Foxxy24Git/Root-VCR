"use client"

import { useMemo, useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  User,
  Mail,
  Phone,
  AtSign,
  Lock,
  Router,
  Hash,
  KeyRound,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react"

export interface PlanOption {
  id: string
  name: string
  price: string
  duration_days: number
  is_trial: boolean
  max_resellers: number
  max_vouchers_per_month: number
}

interface Props {
  plans: PlanOption[]
}

interface FieldErrors {
  [key: string]: string[] | undefined
}

const idr = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v)

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

export function CreateTenantForm({ plans }: Props) {
  const router = useRouter()
  const defaultPlanId = plans.find((p) => p.is_trial)?.id ?? plans[0]?.id ?? ""

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [ownerName, setOwnerName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ownerPhone, setOwnerPhone] = useState("")

  const [mikrotikHost, setMikrotikHost] = useState("")
  const [mikrotikPort, setMikrotikPort] = useState(8728)
  const [mikrotikUsername, setMikrotikUsername] = useState("")
  const [mikrotikPassword, setMikrotikPassword] = useState("")
  const [mikrotikUseSSL, setMikrotikUseSSL] = useState(false)

  const [planId, setPlanId] = useState(defaultPlanId)

  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [topError, setTopError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId),
    [plans, planId],
  )

  function handleNameChange(v: string) {
    setName(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTopError(null)
    setFieldErrors({})

    try {
      const res = await fetch("/api/super-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          owner_name: ownerName,
          owner_email: ownerEmail,
          owner_phone: ownerPhone,
          mikrotik_host: mikrotikHost,
          mikrotik_port: mikrotikPort,
          mikrotik_username: mikrotikUsername,
          mikrotik_password: mikrotikPassword,
          mikrotik_use_ssl: mikrotikUseSSL,
          plan_id: planId || undefined,
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data?.issues) {
          setFieldErrors(data.issues as FieldErrors)
          setTopError("Periksa kembali field yang ditandai merah.")
        } else {
          setTopError(data?.message ?? "Gagal membuat tenant")
        }
        return
      }

      router.push(`/super-admin/tenants/${data.tenant.id}`)
      router.refresh()
    } catch {
      setTopError("Terjadi kesalahan jaringan. Coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {topError && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{topError}</span>
        </div>
      )}

      {/* Section: Data Customer */}
      <Section
        title="Data Customer"
        description="Identitas tenant dan PIC pemilik."
        icon={Building2}
      >
        <Field label="Nama Tenant" error={fieldErrors.name}>
          <TextInput
            icon={Building2}
            value={name}
            onChange={handleNameChange}
            placeholder="WiFi Cepat Jaya"
            required
          />
        </Field>
        <Field label="Slug" error={fieldErrors.slug} hint="huruf kecil, angka, tanda hubung">
          <TextInput
            icon={Hash}
            value={slug}
            onChange={(v) => {
              setSlugTouched(true)
              setSlug(v.toLowerCase())
            }}
            placeholder="wificepatjaya"
            required
          />
        </Field>
        <Field label="Nama Owner" error={fieldErrors.owner_name}>
          <TextInput
            icon={User}
            value={ownerName}
            onChange={setOwnerName}
            placeholder="Budi Santoso"
            required
          />
        </Field>
        <Field label="Email Owner" error={fieldErrors.owner_email}>
          <TextInput
            icon={Mail}
            type="email"
            value={ownerEmail}
            onChange={setOwnerEmail}
            placeholder="owner@email.com"
            required
          />
        </Field>
        <Field label="No. HP Owner" error={fieldErrors.owner_phone}>
          <TextInput
            icon={Phone}
            value={ownerPhone}
            onChange={setOwnerPhone}
            placeholder="081234567890"
            required
          />
        </Field>
      </Section>

      {/* Section: MikroTik Config */}
      <Section
        title="MikroTik Configuration"
        description="Kredensial akan di-encrypt sebelum disimpan."
        icon={Router}
      >
        <Field label="Host / IP" error={fieldErrors.mikrotik_host}>
          <TextInput
            icon={Router}
            value={mikrotikHost}
            onChange={setMikrotikHost}
            placeholder="192.168.88.1"
            required
          />
        </Field>
        <Field label="Port API" error={fieldErrors.mikrotik_port}>
          <TextInput
            icon={Hash}
            type="number"
            value={String(mikrotikPort)}
            onChange={(v) => setMikrotikPort(parseInt(v) || 0)}
            placeholder="8728"
            required
          />
        </Field>
        <Field label="Username" error={fieldErrors.mikrotik_username}>
          <TextInput
            icon={User}
            value={mikrotikUsername}
            onChange={setMikrotikUsername}
            placeholder="admin"
            required
          />
        </Field>
        <Field label="Password" error={fieldErrors.mikrotik_password}>
          <TextInput
            icon={KeyRound}
            type="password"
            value={mikrotikPassword}
            onChange={setMikrotikPassword}
            placeholder="••••••••"
            required
          />
        </Field>

        <div className="md:col-span-2 flex items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Gunakan SSL/TLS
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aktifkan jika MikroTik pakai API-SSL (port 8729).
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={mikrotikUseSSL}
              onChange={(e) => setMikrotikUseSSL(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-cyan-400 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
          </label>
        </div>

        <div className="md:col-span-2 flex items-start gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Test koneksi MikroTik tersedia di halaman detail tenant setelah dibuat.
          </span>
        </div>
      </Section>

      {/* Section: Plan */}
      <Section
        title="Plan"
        description="Paket subscription. Default: Trial 14 hari gratis."
        icon={ShieldCheck}
      >
        <div className="md:col-span-2 flex items-start gap-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900 px-4 py-3 text-xs text-purple-700 dark:text-purple-300">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Tenant baru otomatis mendapat <strong>trial 14 hari gratis</strong>. Pilih plan
            berbayar di bawah untuk langsung skip trial dan mulai subscription aktif.
          </span>
        </div>

        <Field
          label="Pilih Plan"
          error={fieldErrors.plan_id}
          hint={
            selectedPlan?.is_trial
              ? "Default: Trial gratis."
              : "Memilih plan berbayar akan skip trial — subscription langsung aktif."
          }
          fullWidth
        >
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {plans.length === 0 && <option value="">Belum ada plan</option>}
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.is_trial ? "Gratis" : idr(Number(p.price))} /{" "}
                {p.duration_days} hari
              </option>
            ))}
          </select>
        </Field>

        {selectedPlan && (
          <div className="md:col-span-2 grid grid-cols-3 gap-3 text-center">
            <PlanMeta label="Durasi" value={`${selectedPlan.duration_days} hari`} />
            <PlanMeta
              label="Max Reseller"
              value={selectedPlan.max_resellers.toLocaleString("id-ID")}
            />
            <PlanMeta
              label="Max Voucher/bln"
              value={selectedPlan.max_vouchers_per_month.toLocaleString("id-ID")}
            />
          </div>
        )}
      </Section>

      {/* Section: Tenant Admin */}
      <Section
        title="Tenant Admin (Login Awal)"
        description="Akun admin pertama yang akan mengelola tenant ini."
        icon={ShieldCheck}
      >
        <Field label="Nama Admin" error={fieldErrors.admin_name}>
          <TextInput
            icon={User}
            value={adminName}
            onChange={setAdminName}
            placeholder="Nama lengkap"
            required
          />
        </Field>
        <Field label="Email Admin" error={fieldErrors.admin_email}>
          <TextInput
            icon={AtSign}
            type="email"
            value={adminEmail}
            onChange={setAdminEmail}
            placeholder="admin@email.com"
            required
          />
        </Field>
        <Field
          label="Password Awal"
          error={fieldErrors.admin_password}
          hint="Min. 6 karakter — admin bisa ganti setelah login."
          fullWidth
        >
          <TextInput
            icon={Lock}
            type="password"
            value={adminPassword}
            onChange={setAdminPassword}
            placeholder="••••••••"
            required
          />
        </Field>
      </Section>

      {/* Submit bar */}
      <div className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 -mx-4 lg:-mx-6 px-4 lg:px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
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
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menyimpan…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Buat Tenant
            </>
          )}
        </button>
      </div>
    </form>
  )
}

// ── UI Sub-components ─────────────────────────────────────────────

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  error,
  hint,
  fullWidth,
  children,
}: {
  label: string
  error?: string[]
  hint?: string
  fullWidth?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={fullWidth ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
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
          "w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
          (Icon ? "pl-10 pr-3" : "px-3")
        }
      />
    </div>
  )
}

function PlanMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
        {value}
      </p>
    </div>
  )
}
