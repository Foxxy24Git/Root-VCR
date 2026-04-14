import { getSessionUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { WalletCard } from "@/components/cards/WalletCard"
import { StatsCard } from "@/components/cards/StatsCard"
import { Ticket, Users } from "lucide-react"
import { GenerateVoucherForm } from "./GenerateVoucherForm"
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="text-slate-500">
          Selamat datang kembali, kelola voucher hotspot Anda di sini.
        </p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <WalletCard balance={balance} />

        <Link href="/reseller/vouchers" className="block">
          <StatsCard
            title="VCR Generated Today"
            value={todayVouchers}
            icon={Ticket}
            trend={{ value: 0, label: "hari ini" }}
            className="h-full"
          />
        </Link>

        <Link
          href="/reseller/vouchers?status=active"
          className="block lg:col-span-1 md:col-span-2"
        >
          <StatsCard
            title="Active Users"
            value={activeVouchers}
            icon={Users}
            className="h-full"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Left Column: Generate Voucher */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                Generate Voucher
              </h2>
            </div>
            <div className="p-6">
              <GenerateVoucherForm
                availableProfiles={availableProfiles}
                currentBalance={balance}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Vouchers Hari Ini */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100 flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Voucher Hari Ini
              </h2>
              <a
                href="/reseller/vouchers"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Lihat Semua
              </a>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">
                      Kode
                    </th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">
                      Profile
                    </th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">
                      Status
                    </th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">
                      Harga
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {recentVouchers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        Belum ada voucher yang dibuat hari ini.
                      </td>
                    </tr>
                  ) : (
                    recentVouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-900 tracking-wider">
                          {v.code}
                        </td>
                        <td className="px-6 py-4">{v.profile?.name ?? "-"}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              v.status === "active"
                                ? "bg-green-100 text-green-700"
                                : v.status === "unused"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : v.status === "expired"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {v.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          Rp {Number(v.price_charged).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
