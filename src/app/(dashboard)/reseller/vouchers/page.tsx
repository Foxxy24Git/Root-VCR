import { getSessionUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Search, Filter, FileText, FileDown, Plus } from "lucide-react"
import Link from "next/link"

import { Prisma } from "@prisma/client"

export const metadata = {
  title: "Voucher Management — Root.VCR",
}

export default async function VoucherManagementPage({
  searchParams,
}: {
  searchParams: { page?: string, status?: string, search?: string, profileId?: string }
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
    whereCondition.status = statusFilter as "unused" | "active" | "expired" | "deleted"
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
      include: { profile: true }
    }),
    prisma.voucher.count({ where: whereCondition }),
    prisma.resellerProfile.findMany({
      where: { user_id: user.id },
      include: { profile: true }
    })
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manajemen Voucher</h1>
          <p className="text-slate-500 mt-1">Kelola dan pantau semua voucher yang Anda generate.</p>
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
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <form className="flex flex-col sm:flex-row w-full md:w-auto gap-3 flex-1">
            <div className="relative flex-1 md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                name="search"
                defaultValue={searchFilter}
                placeholder="Cari kode voucher..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <select 
                name="status"
                defaultValue={statusFilter || "all"}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-32 cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="unused">Unused</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
              
              <select 
                name="profileId"
                defaultValue={profileFilter || "all"}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[140px] cursor-pointer"
              >
                <option value="all">Semua Profile</option>
                {resellerProfiles.map(rp => (
                  <option key={rp.profile.id} value={rp.profile.id}>{rp.profile.name}</option>
                ))}
              </select>
              
              <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                Filter
              </button>
            </div>
          </form>

          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
              <FileDown className="w-4 h-4" /> PDF
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
              <FileText className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>

        {/* Table View (Desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Kode Voucher</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Profile</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Generated</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Digunakan</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Harga Beli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <Filter className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                    <p className="text-base font-medium text-slate-900">Tidak ada data</p>
                    <p className="text-sm">Tidak ada voucher yang sesuai dengan filter Anda.</p>
                  </td>
                </tr>
              ) : (
                vouchers.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 tracking-wider">
                      {v.code}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {v.profile?.name ?? "-"}
                    </td>
                    <td className="px-6 py-4">
                      {v.generated_at.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      {v.used_at ? v.used_at.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' }) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        v.status === 'active' ? 'bg-green-100 text-green-700' :
                        v.status === 'unused' ? 'bg-yellow-100 text-yellow-700' :
                        v.status === 'expired' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {v.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      Rp {Number(v.price_charged).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card View (Mobile) */}
        <div className="md:hidden divide-y divide-slate-100">
          {vouchers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 px-4">
              <Filter className="w-8 h-8 mx-auto text-slate-300 mb-3" />
              <p className="text-base font-medium text-slate-900">Tidak ada data</p>
            </div>
          ) : (
            vouchers.map(v => (
              <div key={v.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-slate-900 text-lg block tracking-wider">{v.code}</span>
                    <span className="text-sm font-medium text-blue-600">{v.profile?.name ?? "-"}</span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    v.status === 'active' ? 'bg-green-100 text-green-700' :
                    v.status === 'unused' ? 'bg-yellow-100 text-yellow-700' :
                    v.status === 'expired' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {v.status.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  <div>
                    <span className="block text-slate-400 mb-0.5">Dibuat</span>
                    <span className="font-medium text-slate-700">{v.generated_at.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 mb-0.5">Digunakan</span>
                    <span className="font-medium text-slate-700">{v.used_at ? v.used_at.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30 text-sm">
            <span className="text-slate-500">
              Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} dari <b>{total}</b>
            </span>
            <div className="flex gap-1">
              <Link
                href={`?page=${Math.max(1, page - 1)}&status=${statusFilter || ''}&profileId=${profileFilter || ''}`}
                className={`px-3 py-1.5 border rounded-md font-medium ${page <= 1 ? 'pointer-events-none opacity-50 text-slate-400 border-slate-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
              >
                Prev
              </Link>
              <Link
                href={`?page=${Math.min(totalPages, page + 1)}&status=${statusFilter || ''}&profileId=${profileFilter || ''}`}
                className={`px-3 py-1.5 border rounded-md font-medium ${page >= totalPages ? 'pointer-events-none opacity-50 text-slate-400 border-slate-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
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
