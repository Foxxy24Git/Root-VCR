import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Wifi, WifiOff, Building2 } from "lucide-react"
import type { Prisma } from "@prisma/client"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { TenantListFilters } from "./_components/TenantListFilters"
import { TenantRowActions } from "./_components/TenantRowActions"

export const metadata = {
  title: "Tenants — Super Admin",
  robots: { index: false, follow: false },
}

const DAY_MS = 86_400_000
const PAGE_SIZE = 20
const MIKROTIK_STALE_MS = 10 * 60_000

interface PageProps {
  searchParams?: {
    search?: string
    status?: string
    page?: string
  }
}

export default async function TenantsListPage({ searchParams }: PageProps) {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  const sp = searchParams ?? {}
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1)
  const search = sp.search?.trim() ?? ""
  const status = sp.status ?? ""

  const now = new Date()
  const where: Prisma.TenantWhereInput = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { owner_name: { contains: search, mode: "insensitive" } },
      { owner_email: { contains: search, mode: "insensitive" } },
    ]
  }
  switch (status) {
    case "trial":
      where.is_trial = true
      where.is_active = true
      break
    case "active":
      where.is_active = true
      where.is_trial = false
      break
    case "suspended":
      where.is_active = false
      break
    case "expired":
      where.is_trial = true
      where.trial_end_at = { lt: now }
      break
  }

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        is_trial: true,
        is_active: true,
        trial_end_at: true,
        subscription_end_at: true,
        mikrotik_host: true,
        mikrotik_last_test_at: true,
        mikrotik_last_test_ok: true,
        plan: { select: { name: true } },
      },
    }),
    prisma.tenant.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const baseQs = new URLSearchParams()
  if (search) baseQs.set("search", search)
  if (status) baseQs.set("status", status)
  const buildPageHref = (p: number) => {
    const next = new URLSearchParams(baseQs.toString())
    next.set("page", String(p))
    return `/super-admin/tenants?${next.toString()}`
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tenants
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {total.toLocaleString("id-ID")} tenant terdaftar
          </p>
        </div>
        <Link
          href="/super-admin/tenants/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Tenant
        </Link>
      </div>

      <TenantListFilters />

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        {tenants.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Tidak ada tenant ditemukan
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-5 py-3">Nama</th>
                    <th className="text-left font-semibold px-5 py-3">Slug</th>
                    <th className="text-left font-semibold px-5 py-3">Plan</th>
                    <th className="text-left font-semibold px-5 py-3">MikroTik</th>
                    <th className="text-left font-semibold px-5 py-3">Expire</th>
                    <th className="text-left font-semibold px-5 py-3">Status</th>
                    <th className="text-right font-semibold px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {tenants.map((t) => {
                    const endAt = t.is_trial ? t.trial_end_at : t.subscription_end_at
                    const daysLeft = endAt
                      ? Math.ceil((endAt.getTime() - now.getTime()) / DAY_MS)
                      : null
                    const mikrotikOk =
                      t.mikrotik_last_test_ok === true &&
                      t.mikrotik_last_test_at !== null &&
                      now.getTime() - t.mikrotik_last_test_at.getTime() <
                        MIKROTIK_STALE_MS

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/super-admin/tenants/${t.id}`}
                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {t.name}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                          {t.slug}
                        </td>
                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                          {t.plan?.name ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={
                              "inline-flex items-center gap-1.5 text-xs font-medium " +
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
                            {mikrotikOk ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {daysLeft === null ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span
                              className={
                                "text-xs font-semibold " +
                                (daysLeft <= 0
                                  ? "text-red-600 dark:text-red-400"
                                  : daysLeft <= 3
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-slate-700 dark:text-slate-300")
                              }
                            >
                              {daysLeft <= 0 ? "Expired" : `${daysLeft} hari`}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge
                            isActive={t.is_active}
                            isTrial={t.is_trial}
                            expired={daysLeft !== null && daysLeft <= 0}
                          />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <TenantRowActions
                            tenantId={t.id}
                            isActive={t.is_active}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/60">
              {tenants.map((t) => {
                const endAt = t.is_trial ? t.trial_end_at : t.subscription_end_at
                const daysLeft = endAt
                  ? Math.ceil((endAt.getTime() - now.getTime()) / DAY_MS)
                  : null
                const mikrotikOk =
                  t.mikrotik_last_test_ok === true &&
                  t.mikrotik_last_test_at !== null &&
                  now.getTime() - t.mikrotik_last_test_at.getTime() <
                    MIKROTIK_STALE_MS
                return (
                  <div key={t.id} className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/super-admin/tenants/${t.id}`}
                        className="block font-semibold text-slate-900 dark:text-slate-100 truncate"
                      >
                        {t.name}
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                        {t.slug} · {t.plan?.name ?? "—"}
                      </p>
                      <div className="mt-2 flex items-center gap-3 flex-wrap">
                        <StatusBadge
                          isActive={t.is_active}
                          isTrial={t.is_trial}
                          expired={daysLeft !== null && daysLeft <= 0}
                        />
                        <span
                          className={
                            "inline-flex items-center gap-1 text-[11px] font-medium " +
                            (mikrotikOk
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400")
                          }
                        >
                          {mikrotikOk ? (
                            <Wifi className="w-3 h-3" />
                          ) : (
                            <WifiOff className="w-3 h-3" />
                          )}
                          MikroTik
                        </span>
                        {daysLeft !== null && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {daysLeft <= 0 ? "Expired" : `${daysLeft}d`}
                          </span>
                        )}
                      </div>
                    </div>
                    <TenantRowActions tenantId={t.id} isActive={t.is_active} />
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 px-5 py-3 text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Halaman {page} dari {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <Link
                      href={buildPageHref(page - 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    >
                      Sebelumnya
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={buildPageHref(page + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    >
                      Selanjutnya
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatusBadge({
  isActive,
  isTrial,
  expired,
}: {
  isActive: boolean
  isTrial: boolean
  expired: boolean
}) {
  if (!isActive) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-semibold uppercase tracking-wider">
        Suspended
      </span>
    )
  }
  if (expired) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
        Expired
      </span>
    )
  }
  if (isTrial) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-semibold uppercase tracking-wider">
        Trial
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
      Aktif
    </span>
  )
}
