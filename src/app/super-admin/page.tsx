import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Ticket,
  AlertTriangle,
  WifiOff,
  ArrowUpRight,
  Clock,
} from "lucide-react"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { StatsCard } from "@/components/cards/StatsCard"
import { TenantGrowthChart, type GrowthPoint } from "./_components/TenantGrowthChart"

export const metadata = {
  title: "Dashboard — Super Admin",
  robots: { index: false, follow: false },
}

const DAY_MS = 86_400_000
const idr = (v: number | bigint) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v))

export default async function SuperAdminDashboardPage() {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS)
  thirtyDaysAgo.setHours(0, 0, 0, 0)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * DAY_MS)
  const mikrotikStaleThreshold = new Date(now.getTime() - 10 * 60_000) // 10 min

  const [
    totalTenants,
    activeTenants,
    revenueAgg,
    totalVouchers,
    growthRows,
    expiringTrials,
    expiringSubs,
    mikrotikOffline,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { is_active: true } }),
    prisma.subscriptionInvoice.aggregate({
      where: { status: "PAID", paid_at: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.voucher.count(),
    prisma.tenant.findMany({
      where: { created_at: { gte: thirtyDaysAgo } },
      select: { created_at: true },
      orderBy: { created_at: "asc" },
    }),
    prisma.tenant.findMany({
      where: {
        is_trial: true,
        is_active: true,
        trial_end_at: { gte: now, lte: sevenDaysFromNow },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        trial_end_at: true,
      },
      orderBy: { trial_end_at: "asc" },
      take: 5,
    }),
    prisma.tenant.findMany({
      where: {
        is_trial: false,
        is_active: true,
        subscription_end_at: { gte: now, lte: sevenDaysFromNow },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        subscription_end_at: true,
      },
      orderBy: { subscription_end_at: "asc" },
      take: 5,
    }),
    prisma.tenant.findMany({
      where: {
        is_active: true,
        OR: [
          { mikrotik_last_test_ok: false },
          { mikrotik_last_test_at: null },
          { mikrotik_last_test_at: { lt: mikrotikStaleThreshold } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        mikrotik_host: true,
        mikrotik_last_test_at: true,
        mikrotik_last_test_ok: true,
      },
      orderBy: { mikrotik_last_test_at: "asc" },
      take: 5,
    }),
  ])

  // ── Build 30-day growth series ────────────────────────────────────
  // Start from cumulative count BEFORE the window (we need it to draw "total").
  const beforeWindowCount =
    (await prisma.tenant.count({ where: { created_at: { lt: thirtyDaysAgo } } })) ?? 0

  const days: GrowthPoint[] = []
  let cumulative = beforeWindowCount
  for (let i = 0; i < 30; i++) {
    const dayStart = new Date(thirtyDaysAgo.getTime() + i * DAY_MS)
    const dayEnd = new Date(dayStart.getTime() + DAY_MS)
    const newToday = growthRows.filter(
      (r) => r.created_at >= dayStart && r.created_at < dayEnd,
    ).length
    cumulative += newToday
    days.push({
      date: dayStart.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      }),
      total: cumulative,
      newToday,
    })
  }

  const revenueValue = Number(revenueAgg._sum.amount ?? 0)
  const suspendedCount = totalTenants - activeTenants

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Super Admin Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
          Ringkasan global semua tenant dan revenue subscription.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/super-admin/tenants" className="block">
          <StatsCard
            title="Total Tenant"
            value={totalTenants.toLocaleString("id-ID")}
            icon={Building2}
            iconClassName="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            className="cursor-pointer"
          />
        </Link>
        <Link href="/super-admin/tenants?status=active" className="block">
          <StatsCard
            title="Tenant Aktif"
            value={activeTenants.toLocaleString("id-ID")}
            icon={CheckCircle2}
            iconClassName="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            trend={
              suspendedCount > 0
                ? { value: -0, label: `${suspendedCount} suspended` }
                : undefined
            }
            className="cursor-pointer"
          />
        </Link>
        <Link href="/super-admin/invoices" className="block">
          <StatsCard
            title="Revenue Bulan Ini"
            value={idr(revenueValue)}
            icon={CircleDollarSign}
            iconClassName="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
            className="cursor-pointer"
          />
        </Link>
        <StatsCard
          title="Voucher Terjual"
          value={totalVouchers.toLocaleString("id-ID")}
          icon={Ticket}
          iconClassName="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
        />
      </div>

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TenantGrowthChart data={days} />
        </div>

        <div className="space-y-6">
          {/* Expiring Soon */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Expire ≤ 7 Hari
                </h3>
              </div>
              <Link
                href="/super-admin/tenants"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                Semua <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <ExpireList trials={expiringTrials} subs={expiringSubs} now={now} />
          </div>

          {/* MikroTik Offline */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                MikroTik Offline
              </h3>
            </div>
            {mikrotikOffline.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500">
                Semua MikroTik OK
              </div>
            ) : (
              <ul className="space-y-3">
                {mikrotikOffline.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/super-admin/tenants/${t.id}`}
                      className="flex items-start justify-between gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {t.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {t.mikrotik_host}
                        </p>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        {t.mikrotik_last_test_at
                          ? "Stale"
                          : "Belum dites"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ExpireList({
  trials,
  subs,
  now,
}: {
  trials: { id: string; name: string; slug: string; trial_end_at: Date | null }[]
  subs: {
    id: string
    name: string
    slug: string
    subscription_end_at: Date | null
  }[]
  now: Date
}) {
  const items = [
    ...trials.map((t) => ({
      id: t.id,
      name: t.name,
      kind: "Trial" as const,
      endAt: t.trial_end_at!,
    })),
    ...subs.map((t) => ({
      id: t.id,
      name: t.name,
      kind: "Subscription" as const,
      endAt: t.subscription_end_at!,
    })),
  ]
    .sort((a, b) => a.endAt.getTime() - b.endAt.getTime())
    .slice(0, 5)

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500">
        Tidak ada yang akan expire dalam 7 hari
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const daysLeft = Math.max(
          0,
          Math.ceil((item.endAt.getTime() - now.getTime()) / DAY_MS),
        )
        return (
          <li key={item.id + item.kind}>
            <Link
              href={`/super-admin/tenants/${item.id}`}
              className="flex items-start justify-between gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.kind}
                </p>
              </div>
              <span
                className={
                  "shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold " +
                  (daysLeft <= 1
                    ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    : daysLeft <= 3
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300")
                }
              >
                {daysLeft}d
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
