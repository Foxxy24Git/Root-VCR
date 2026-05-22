import { redirect } from "next/navigation"
import { Package } from "lucide-react"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { PlansClient, type PlanRow } from "./_components/PlansClient"

export const metadata = {
  title: "Plans — Super Admin",
  robots: { index: false, follow: false },
}

export default async function PlansPage() {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  const plans = await prisma.plan.findMany({
    orderBy: [{ is_trial: "desc" }, { price: "asc" }, { created_at: "asc" }],
    include: { _count: { select: { tenants: true } } },
  })

  const rows: PlanRow[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price.toString(),
    duration_days: p.duration_days,
    is_trial: p.is_trial,
    max_resellers: p.max_resellers,
    max_vouchers_per_month: p.max_vouchers_per_month,
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
    is_active: p.is_active,
    tenant_count: p._count.tenants,
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Plans
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {rows.length} paket subscription terdaftar
            </p>
          </div>
        </div>
      </div>

      <PlansClient initialPlans={rows} />
    </div>
  )
}
