import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AdminWalletTable } from "./AdminWalletTable"
import { StatsCard } from "@/components/cards/StatsCard"
import { WalletIcon, ArrowUpRight, ArrowDownRight } from "lucide-react"

export const metadata = {
  title: "Wallet Management — Root.VCR",
}

export default async function AdminWalletPage() {
  const { user, error } = await requireAdmin()
  if (error || !user) redirect("/login")

  const [wallets, aggregate] = await Promise.all([
    prisma.wallet.findMany({
      include: {
        user: { select: { name: true, email: true, is_active: true } }
      },
      orderBy: { balance: 'desc' }
    }),
    prisma.wallet.aggregate({
      _sum: { balance: true, total_topup: true, total_spent: true }
    })
  ])

  const mappedResellers = wallets
    .filter(w => w.user.is_active) // Only show active resellers generally
    .map(w => ({
      id: w.user_id,
      name: w.user.name,
      email: w.user.email,
      balance: Number(w.balance),
      total_spent: Number(w.total_spent)
    }))

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dana & Wallet</h1>
        <p className="text-slate-500 mt-1">Kelola saldo dan riwayat deposit semua reseller.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Saldo Beredar"
          value={new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(aggregate._sum.balance || 0))}
          icon={WalletIcon}
          iconClassName="bg-indigo-50 text-indigo-600"
        />
        <StatsCard
          title="Total Top Up (Masuk)"
          value={new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(aggregate._sum.total_topup || 0))}
          icon={ArrowDownRight}
          iconClassName="bg-green-50 text-green-600"
        />
        <StatsCard
          title="Total Pemakaian (Keluar)"
          value={new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(aggregate._sum.total_spent || 0))}
          icon={ArrowUpRight}
          iconClassName="bg-red-50 text-red-600"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Daftar Akun & Saldo</h2>
        <AdminWalletTable resellers={mappedResellers} />
      </div>
    </div>
  )
}
