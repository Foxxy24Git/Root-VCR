import { getSessionUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Search, Plus } from "lucide-react"
import Link from "next/link"
import { Prisma } from "@prisma/client"
import { VouchersClient } from "./VouchersClient"

export const metadata = {
  title: "Voucher Management — Root.VCR",
}

export default async function VoucherManagementPage({
  searchParams,
}: {
  searchParams: {
    page?: string
    status?: string
    search?: string
    profileId?: string
  }
}) {
  const user = await getSessionUser()
  if (!user || user.role !== "reseller") {
    redirect("/login")
  }

  const page = parseInt(searchParams.page ?? "1")
  const limit = 20
  const skip = (page - 1) * limit

  const statusFilter = searchParams.status
  const searchFilter = searchParams.search
  const profileFilter = searchParams.profileId

  const whereCondition: Prisma.VoucherWhereInput = { user_id: user.id }

  if (statusFilter && statusFilter !== "all") {
    whereCondition.status = statusFilter as
      | "unused"
      | "active"
      | "expired"
      | "deleted"
  }
  if (profileFilter && profileFilter !== "all") {
    whereCondition.profile_id = profileFilter
  }
  if (searchFilter) {
    whereCondition.code = { contains: searchFilter, mode: "insensitive" }
  }

  const [vouchers, total, resellerProfiles] = await Promise.all([
    prisma.voucher.findMany({
      where: whereCondition,
      orderBy: { generated_at: "desc" },
      skip,
      take: limit,
      include: { profile: true },
    }),
    prisma.voucher.count({ where: whereCondition }),
    prisma.resellerProfile.findMany({
      where: { user_id: user.id },
      include: { profile: true },
    }),
  ])

  const totalPages = Math.ceil(total / limit)

  const serializedVouchers = vouchers.map((v) => ({
    id: v.id,
    code: v.code,
    status: v.status,
    price_charged: Number(v.price_charged),
    generated_at: v.generated_at.toISOString(),
    used_at: v.used_at?.toISOString() ?? null,
    expired_at: v.expired_at?.toISOString() ?? null,
    client_ip: v.client_ip,
    client_mac: v.client_mac,
    profile: v.profile ? { id: v.profile.id, name: v.profile.name } : null,
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Manajemen Voucher
          </h1>
          <p className="text-slate-500 mt-1">
            Kelola dan pantau semua voucher yang Anda generate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/reseller/dashboard"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Generate Baru
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <form className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={searchFilter}
                placeholder="Cari kode voucher..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                name="status"
                defaultValue={statusFilter || "all"}
                className="flex-1 min-w-[120px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Semua Status</option>
                <option value="unused">Unused</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
              <select
                name="profileId"
                defaultValue={profileFilter || "all"}
                className="flex-1 min-w-[130px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Semua Profile</option>
                {resellerProfiles.map((rp) => (
                  <option key={rp.profile.id} value={rp.profile.id}>
                    {rp.profile.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        {/* Table, Export & Modal — client component */}
        <VouchersClient vouchers={serializedVouchers} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30 text-sm">
            <span className="text-slate-500">
              Menampilkan {(page - 1) * limit + 1} -{" "}
              {Math.min(page * limit, total)} dari <b>{total}</b>
            </span>
            <div className="flex gap-1">
              <Link
                href={`?page=${Math.max(1, page - 1)}&status=${statusFilter || ""}&profileId=${profileFilter || ""}`}
                className={`px-3 py-1.5 border rounded-md font-medium ${page <= 1 ? "pointer-events-none opacity-50 text-slate-400 border-slate-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
              >
                Prev
              </Link>
              <Link
                href={`?page=${Math.min(totalPages, page + 1)}&status=${statusFilter || ""}&profileId=${profileFilter || ""}`}
                className={`px-3 py-1.5 border rounded-md font-medium ${page >= totalPages ? "pointer-events-none opacity-50 text-slate-400 border-slate-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
              >
                Next
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
