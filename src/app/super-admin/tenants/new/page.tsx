import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { CreateTenantForm, type PlanOption } from "./CreateTenantForm"

export const metadata = {
  title: "Tambah Tenant — Super Admin",
  robots: { index: false, follow: false },
}

export default async function NewTenantPage() {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  const plans = await prisma.plan.findMany({
    where: { is_active: true },
    orderBy: [{ is_trial: "desc" }, { price: "asc" }],
    select: {
      id: true,
      name: true,
      price: true,
      duration_days: true,
      is_trial: true,
      max_resellers: true,
      max_vouchers_per_month: true,
    },
  })

  const planOptions: PlanOption[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price.toString(),
    duration_days: p.duration_days,
    is_trial: p.is_trial,
    max_resellers: p.max_resellers,
    max_vouchers_per_month: p.max_vouchers_per_month,
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <div>
        <Link
          href="/super-admin/tenants"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke daftar tenant
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-2">
          Tambah Tenant Baru
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Default plan: Trial 14 hari (gratis). Tenant Admin akan login dengan email yang Anda set di bawah.
        </p>
      </div>

      <CreateTenantForm plans={planOptions} />
    </div>
  )
}
