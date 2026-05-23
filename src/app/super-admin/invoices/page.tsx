import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
import type { InvoiceStatus, Prisma } from "@prisma/client"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { InvoiceListClient, type InvoiceRow } from "./_components/InvoiceListClient"

export const metadata = {
  title: "Invoices — Super Admin",
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 20
const VALID_STATUSES: InvoiceStatus[] = [
  "PENDING",
  "AWAITING_VERIFICATION",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]

interface PageProps {
  searchParams?: {
    status?: string
    tenantId?: string
    search?: string
    page?: string
  }
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  const sp = searchParams ?? {}
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1)
  const search = sp.search?.trim()
  const statusParam = sp.status as InvoiceStatus | undefined
  const tenantId = sp.tenantId

  const where: Prisma.SubscriptionInvoiceWhereInput = {}

  if (statusParam && VALID_STATUSES.includes(statusParam)) {
    where.status = statusParam
  }

  if (tenantId) where.tenant_id = tenantId

  if (search) {
    where.OR = [
      { invoice_number: { contains: search, mode: "insensitive" } },
      { tenant: { name: { contains: search, mode: "insensitive" } } },
      { tenant: { slug: { contains: search, mode: "insensitive" } } },
    ]
  }

  const skip = (page - 1) * PAGE_SIZE

  const [invoices, total, awaitingCount] = await Promise.all([
    prisma.subscriptionInvoice.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: [{ status: "asc" }, { created_at: "desc" }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.subscriptionInvoice.count({ where }),
    prisma.subscriptionInvoice.count({ where: { status: "AWAITING_VERIFICATION" } }),
  ])

  const rows: InvoiceRow[] = invoices.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    amount: inv.amount.toString(),
    period_start: inv.period_start.toISOString(),
    period_end: inv.period_end.toISOString(),
    status: inv.status,
    paid_at: inv.paid_at?.toISOString() ?? null,
    created_at: inv.created_at.toISOString(),
    tenant: inv.tenant,
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Invoices
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {total.toLocaleString("id-ID")} invoice
              {awaitingCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-semibold">
                  {awaitingCount} perlu verifikasi
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <InvoiceListClient
        invoices={rows}
        meta={{
          total,
          page,
          page_size: PAGE_SIZE,
          total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        }}
      />
    </div>
  )
}
