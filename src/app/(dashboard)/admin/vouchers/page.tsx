import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { VoucherAdminTabs } from "./VoucherAdminTabs"

export const metadata = {
  title: "Voucher Management — Root.VCR Admin",
}

export default async function AdminVouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string; profileId?: string; tab?: string }>
}) {
  const { user, error } = await requireAdmin()
  if (error || !user) redirect("/login")

  const sp = await searchParams

  const page = parseInt(sp.page ?? "1")
  const limit = 20
  const skip = (page - 1) * limit

  const statusFilter = sp.status
  const searchFilter = sp.search
  const profileFilter = sp.profileId
  const initialTab = (sp.tab === "profiles" || sp.tab === "pppoe") ? sp.tab : "vouchers"

  const tenantId = user.tenantId!

  // Build voucher filter
  const whereCondition: Prisma.VoucherWhereInput = {
    tenant_id: tenantId,
  }
  if (statusFilter && statusFilter !== "all") whereCondition.status = statusFilter as Prisma.EnumVoucherStatusFilter
  if (profileFilter && profileFilter !== "all") whereCondition.profile_id = profileFilter
  if (searchFilter) {
    whereCondition.OR = [
      { code: { contains: searchFilter, mode: "insensitive" } },
      { user: { name: { contains: searchFilter, mode: "insensitive" } } },
    ]
  }

  const [profiles, vouchers, totalVouchers] = await Promise.all([
    prisma.profile.findMany({
      where: { tenant_id: tenantId },
      orderBy: { price: "asc" },
    }),
    prisma.voucher.findMany({
      where: whereCondition,
      orderBy: { generated_at: "desc" },
      skip,
      take: limit,
      include: {
        profile: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.voucher.count({ where: whereCondition }),
  ])

  const mappedProfiles = profiles.map(p => ({
    id: p.id,
    name: p.name,
    duration_days: p.duration_days,
    duration_hours: p.duration_hours,
    price: Number(p.price),
    speed_limit: p.speed_limit,
    mikrotik_profile: p.mikrotik_profile,
    is_active: p.is_active,
  }))

  const mappedVouchers = vouchers.map(v => ({
    id: v.id,
    code: v.code,
    profile_name: v.profile?.name ?? null,
    user_name: v.user?.name ?? null,
    status: v.status,
    generated_at: v.generated_at.toISOString(),
    used_at: v.used_at?.toISOString() ?? null,
    expired_at: v.expired_at?.toISOString() ?? null,
    client_ip: v.client_ip ?? null,
    client_mac: v.client_mac ?? null,
    price_charged: Number(v.price_charged),
    password: v.password ?? null,
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Voucher Management</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola profile voucher, lihat semua voucher, dan PPPoE.</p>
      </div>

      <VoucherAdminTabs
        profiles={mappedProfiles}
        vouchers={mappedVouchers}
        totalVouchers={totalVouchers}
        currentPage={page}
        searchFilter={searchFilter}
        statusFilter={statusFilter}
        profileFilter={profileFilter}
        initialTab={initialTab}
      />
    </div>
  )
}
