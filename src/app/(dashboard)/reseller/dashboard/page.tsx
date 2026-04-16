import { getSessionUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { WalletCard } from "@/components/cards/WalletCard"
import { StatsCard } from "@/components/cards/StatsCard"
import { Ticket, Users } from "lucide-react"
import { GenerateVoucherForm } from "./GenerateVoucherForm"
import { ActiveUsersCard } from "./ActiveUsersCard"
import { calculateResellerPrice } from "@/lib/utils"
import Link from "next/link"

export const metadata = {
  title: "Reseller Dashboard — Root.VCR",
}

export default async function ResellerDashboard() {
  const user = await getSessionUser()
  if (!user || user.role !== "reseller") {
    redirect("/login")
  }

  const [dbUser, wallet, todayVouchers, activeVouchers, recentVouchers, resellerProfiles] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { fee_percentage: true },
      }),
      prisma.wallet.findUnique({ where: { user_id: user.id } }),

      prisma.voucher.count({
        where: {
          user_id: user.id,
          generated_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      prisma.voucher.count({
        where: {
          user_id: user.id,
          status: "active",
        },
      }),

      prisma.voucher.findMany({
        where: {
          user_id: user.id,
          generated_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        orderBy: { generated_at: "desc" },
        take: 5,
        include: { profile: true },
      }),

      prisma.resellerProfile.findMany({
        where: { user_id: user.id, is_enabled: true },
        include: { profile: true },
      }),
    ])

  const balance = Number(wallet?.balance ?? 0)
  const feePercentage = Number(dbUser?.fee_percentage ?? 0)

  const availableProfiles = resellerProfiles
    .filter((rp) => rp.profile.is_active)
    .map((rp) => {
      const basePrice = Number(rp.profile.price)
      const { resellerPrice } = calculateResellerPrice(basePrice, feePercentage)
      return {
        id: rp.profile.id,
        name: rp.profile.name,
        duration_days: rp.profile.duration_days,
        basePrice,
        resellerPrice,
      }
    })

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-0 animate-slide-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">Selamat datang kembali, kelola voucher hotspot Anda di sini.</p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <WalletCard balance={balance} />

        <Link href="/voucher/semua" className="block hover:scale-[1.02] transition-transform">
          <StatsCard
            title="VCR Generated Today"
            value={todayVouchers}
            icon={Ticket}
            trend={{ value: 0, label: "hari ini" }}
            className="h-full"
          />
        </Link>

        <Link href="/reseller/vouchers?status=active" className="block sm:col-span-2 lg:col-span-1">
          <StatsCard
            title="Active Users"
            value={activeVouchers}
            icon={Users}
            className="h-full"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Generate Voucher */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100 dark:border-slate-700 transition-colors duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Generate Voucher</h2>
            </div>
            <div className="p-5">
              <GenerateVoucherForm availableProfiles={availableProfiles} currentBalance={balance} />
            </div>
          </div>
        </div>

        {/* Right Column: Vouchers Hari Ini */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100 dark:border-slate-700 transition-colors duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Voucher Hari Ini</h2>
              <a href="/reseller/vouchers" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                Lihat Semua
              </a>
            </div>

            {recentVouchers.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                Belum ada voucher yang dibuat hari ini.
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Kode</th>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Profile</th>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Status</th>
                        <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs text-right">Harga</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                      {recentVouchers.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                          <td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100 tracking-wider">{v.code}</td>
                          <td className="px-5 py-3">{v.profile?.name ?? "-"}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              v.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                              v.status === "unused" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              v.status === "expired" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                            }`}>{v.status.toUpperCase()}</span>
                          </td>
                          <td className="px-5 py-3 text-right">Rp {Number(v.price_charged).toLocaleString("id-ID")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
                  {recentVouchers.map((v) => (
                    <div key={v.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100 tracking-wider">{v.code}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">{v.profile?.name ?? "-"}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold mb-1 ${
                          v.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          v.status === "unused" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>{v.status.toUpperCase()}</span>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Rp {Number(v.price_charged).toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ActiveUsersCard />
    </div>
  )
}
