import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Router,
  CalendarRange,
  Users,
  Receipt,
  ScrollText,
  Mail,
  Phone,
  User,
  Wifi,
  WifiOff,
  Shield,
} from "lucide-react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { TenantActions, GenerateInvoiceButton } from "./_components/TenantActions"
import { MikroTikTestButton } from "./_components/MikroTikTestButton"
import { InvoiceStatusBadge } from "@/app/super-admin/_components/InvoiceStatusBadge"

export const metadata = {
  title: "Detail Tenant — Super Admin",
  robots: { index: false, follow: false },
}

const DAY_MS = 86_400_000
const MIKROTIK_STALE_MS = 10 * 60_000
const idr = (v: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v))

const dateFmt = (d: Date | null | undefined) =>
  d
    ? d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—"

const dateTimeFmt = (d: Date | null | undefined) =>
  d
    ? d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
    : "—"

export default async function TenantDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      slug: true,
      owner_name: true,
      owner_email: true,
      owner_phone: true,
      mikrotik_host: true,
      mikrotik_port: true,
      mikrotik_username: true,
      mikrotik_use_ssl: true,
      mikrotik_last_test_at: true,
      mikrotik_last_test_ok: true,
      mikrotik_last_edited_at: true,
      is_trial: true,
      trial_end_at: true,
      subscription_start_at: true,
      subscription_end_at: true,
      is_active: true,
      suspended_reason: true,
      max_resellers: true,
      max_vouchers_per_month: true,
      created_at: true,
      plan: {
        select: { id: true, name: true, price: true, duration_days: true },
      },
    },
  })

  if (!tenant) notFound()

  const [resellers, invoices, auditLogs, voucherCount] = await Promise.all([
    prisma.user.findMany({
      where: { tenant_id: tenant.id, role: "RESELLER" },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        is_frozen: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 20,
    }),
    prisma.subscriptionInvoice.findMany({
      where: { tenant_id: tenant.id },
      orderBy: { created_at: "desc" },
      take: 20,
      select: {
        id: true,
        invoice_number: true,
        amount: true,
        period_start: true,
        period_end: true,
        status: true,
        paid_at: true,
        created_at: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { tenant_id: tenant.id },
      orderBy: { created_at: "desc" },
      take: 30,
      select: {
        id: true,
        action: true,
        resource: true,
        ip_address: true,
        created_at: true,
      },
    }),
    prisma.voucher.count({ where: { tenant_id: tenant.id } }),
  ])

  const now = new Date()
  const endAt = tenant.is_trial ? tenant.trial_end_at : tenant.subscription_end_at
  const daysLeft = endAt
    ? Math.ceil((endAt.getTime() - now.getTime()) / DAY_MS)
    : null
  const mikrotikOk =
    tenant.mikrotik_last_test_ok === true &&
    tenant.mikrotik_last_test_at !== null &&
    now.getTime() - tenant.mikrotik_last_test_at.getTime() < MIKROTIK_STALE_MS

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
      {/* Breadcrumb + Header */}
      <div>
        <Link
          href="/super-admin/tenants"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke daftar tenant
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shrink-0">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {tenant.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {tenant.slug}
                </span>
                <StatusBadge
                  isActive={tenant.is_active}
                  isTrial={tenant.is_trial}
                  expired={daysLeft !== null && daysLeft <= 0}
                />
                <span
                  className={
                    "inline-flex items-center gap-1 text-xs font-medium " +
                    (mikrotikOk
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400")
                  }
                >
                  {mikrotikOk ? (
                    <Wifi className="w-3.5 h-3.5" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5" />
                  )}
                  MikroTik {mikrotikOk ? "Online" : "Offline"}
                </span>
              </div>
              {!tenant.is_active && tenant.suspended_reason && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Alasan suspend: {tenant.suspended_reason}
                </p>
              )}
            </div>
          </div>

          <TenantActions
            tenantId={tenant.id}
            isActive={tenant.is_active}
            isTrial={tenant.is_trial}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="mikrotik">
            <Router className="w-3.5 h-3.5 mr-1.5" />
            MikroTik
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CalendarRange className="w-3.5 h-3.5 mr-1.5" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="resellers">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Resellers ({resellers.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="w-3.5 h-3.5 mr-1.5" />
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            <ScrollText className="w-3.5 h-3.5 mr-1.5" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard title="Owner / PIC">
              <InfoRow icon={User} label="Nama" value={tenant.owner_name} />
              <InfoRow icon={Mail} label="Email" value={tenant.owner_email} />
              <InfoRow icon={Phone} label="Telepon" value={tenant.owner_phone} />
            </InfoCard>

            <InfoCard title="Statistik">
              <InfoRow label="Plan" value={tenant.plan?.name ?? "—"} />
              <InfoRow
                label="Voucher Generated"
                value={voucherCount.toLocaleString("id-ID")}
              />
              <InfoRow
                label="Reseller"
                value={`${resellers.length} / ${tenant.max_resellers}`}
              />
              <InfoRow
                label="Max Voucher/Bulan"
                value={tenant.max_vouchers_per_month.toLocaleString("id-ID")}
              />
              <InfoRow label="Dibuat" value={dateFmt(tenant.created_at)} />
            </InfoCard>
          </div>
        </TabsContent>

        {/* MikroTik */}
        <TabsContent value="mikrotik" className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  MikroTik Configuration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Password ter-encrypt — gunakan halaman Edit untuk mengganti.
                </p>
              </div>
              <MikroTikTestButton tenantId={tenant.id} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <KvCard label="Host / IP" value={tenant.mikrotik_host} mono />
              <KvCard label="Port" value={String(tenant.mikrotik_port)} mono />
              <KvCard label="Username" value={tenant.mikrotik_username} mono />
              <KvCard
                label="SSL/TLS"
                value={tenant.mikrotik_use_ssl ? "Enabled" : "Disabled"}
              />
              <KvCard
                label="Test Terakhir"
                value={dateTimeFmt(tenant.mikrotik_last_test_at)}
              />
              <KvCard
                label="Status Test Terakhir"
                value={
                  tenant.mikrotik_last_test_ok === null
                    ? "Belum dites"
                    : tenant.mikrotik_last_test_ok
                      ? "✓ OK"
                      : "✗ Gagal"
                }
                tone={
                  tenant.mikrotik_last_test_ok === true
                    ? "ok"
                    : tenant.mikrotik_last_test_ok === false
                      ? "err"
                      : undefined
                }
              />
              <KvCard
                label="Config Terakhir Diubah"
                value={dateTimeFmt(tenant.mikrotik_last_edited_at)}
              />
            </div>
          </div>
        </TabsContent>

        {/* Subscription */}
        <TabsContent value="subscription" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KvCard
              label="Status"
              value={
                tenant.is_trial
                  ? "Trial"
                  : tenant.is_active
                    ? "Aktif"
                    : "Suspended"
              }
              tone={
                tenant.is_trial ? undefined : tenant.is_active ? "ok" : "err"
              }
            />
            <KvCard label="Plan" value={tenant.plan?.name ?? "—"} />
            <KvCard
              label="Harga / Periode"
              value={
                tenant.plan
                  ? `${idr(tenant.plan.price.toString())} / ${tenant.plan.duration_days} hari`
                  : "—"
              }
            />
            <KvCard
              label={tenant.is_trial ? "Trial Mulai" : "Subscription Mulai"}
              value={dateFmt(
                tenant.is_trial ? tenant.created_at : tenant.subscription_start_at,
              )}
            />
            <KvCard
              label={tenant.is_trial ? "Trial Berakhir" : "Subscription Berakhir"}
              value={dateFmt(endAt)}
            />
            <KvCard
              label="Sisa Hari"
              value={
                daysLeft === null
                  ? "—"
                  : daysLeft <= 0
                    ? "Expired"
                    : `${daysLeft} hari`
              }
              tone={
                daysLeft === null
                  ? undefined
                  : daysLeft <= 0
                    ? "err"
                    : daysLeft <= 3
                      ? "warn"
                      : "ok"
              }
            />
          </div>
        </TabsContent>

        {/* Resellers */}
        <TabsContent value="resellers">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
            {resellers.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
                Belum ada reseller di tenant ini.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-5 py-3">Nama</th>
                    <th className="text-left font-semibold px-5 py-3">Email</th>
                    <th className="text-left font-semibold px-5 py-3">Status</th>
                    <th className="text-left font-semibold px-5 py-3">Dibuat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {resellers.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {r.name}
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                        {r.email}
                      </td>
                      <td className="px-5 py-3">
                        {r.is_frozen ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
                            Frozen
                          </span>
                        ) : r.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-semibold uppercase tracking-wider">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                        {dateFmt(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
                Belum ada invoice untuk tenant ini.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-5 py-3">No. Invoice</th>
                    <th className="text-left font-semibold px-5 py-3">Periode</th>
                    <th className="text-right font-semibold px-5 py-3">Jumlah</th>
                    <th className="text-left font-semibold px-5 py-3">Status</th>
                    <th className="text-left font-semibold px-5 py-3">Dibayar</th>
                    <th className="text-right font-semibold px-5 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-5 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {inv.invoice_number}
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {dateFmt(inv.period_start)} – {dateFmt(inv.period_end)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {idr(inv.amount.toString())}
                      </td>
                      <td className="px-5 py-3">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {dateTimeFmt(inv.paid_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/super-admin/invoices/${inv.id}`}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 px-5 py-3">
              <Link
                href={`/super-admin/invoices?tenantId=${tenant.id}`}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Lihat semua invoice tenant ini →
              </Link>
              <GenerateInvoiceButton tenantId={tenant.id} />
            </div>
          </div>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                Belum ada aktivitas tercatat.
              </div>
            ) : (
              <ul className="space-y-4">
                {auditLogs.map((log) => (
                  <li key={log.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {log.action}
                      </p>
                      {log.resource && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {log.resource}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {dateTimeFmt(log.created_at)}
                        {log.ip_address ? ` · ${log.ip_address}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────────────

function StatusBadge({
  isActive,
  isTrial,
  expired,
}: {
  isActive: boolean
  isTrial: boolean
  expired: boolean
}) {
  if (!isActive)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-semibold uppercase tracking-wider">
        Suspended
      </span>
    )
  if (expired)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
        Expired
      </span>
    )
  if (isTrial)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-semibold uppercase tracking-wider">
        Trial
      </span>
    )
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
      Aktif
    </span>
  )
}

function InfoCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
      <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">
        {title}
      </h3>
      <dl className="space-y-3">{children}</dl>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <dt className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </dt>
        <dd className="text-sm text-slate-900 dark:text-slate-100 mt-0.5 break-words">
          {value}
        </dd>
      </div>
    </div>
  )
}

function KvCard({
  label,
  value,
  mono,
  tone,
}: {
  label: string
  value: string
  mono?: boolean
  tone?: "ok" | "warn" | "err"
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "err"
          ? "text-red-600 dark:text-red-400"
          : "text-slate-900 dark:text-slate-100"
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 px-4 py-3">
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <p
        className={
          "mt-1 text-sm font-semibold " +
          toneClass +
          (mono ? " font-mono" : "")
        }
      >
        {value}
      </p>
    </div>
  )
}

