import { redirect } from "next/navigation"
import { Receipt } from "lucide-react"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { BankAccountsClient, type BankAccountRow } from "./_components/BankAccountsClient"

export const metadata = {
  title: "Bank Accounts — Super Admin",
  robots: { index: false, follow: false },
}

export default async function BankAccountsPage() {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  const accounts = await prisma.bankAccount.findMany({
    orderBy: [{ display_order: "asc" }, { created_at: "asc" }],
  })

  const rows: BankAccountRow[] = accounts.map((a) => ({
    id: a.id,
    bank_name: a.bank_name,
    account_number: a.account_number,
    account_holder: a.account_holder,
    notes: a.notes,
    is_active: a.is_active,
    display_order: a.display_order,
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Bank Accounts
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Rekening tujuan transfer yang ditampilkan ke tenant saat bayar invoice
            </p>
          </div>
        </div>
      </div>

      <BankAccountsClient initialAccounts={rows} />
    </div>
  )
}
