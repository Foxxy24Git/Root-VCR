import { NextRequest, NextResponse } from "next/server"
import type { Prisma, InvoiceStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin, paginate } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { createInvoiceSchema } from "@/lib/validations/invoice"
import { generateInvoice } from "@/lib/invoice"

const PAGE_SIZE = 20

const VALID_STATUSES: InvoiceStatus[] = [
  "PENDING",
  "AWAITING_VERIFICATION",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]

// ─────────────────────────────────────────────────────────────────────
// GET /api/super-admin/invoices
// Query params: ?status= ?tenantId= ?search= ?page=
// ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const status = sp.get("status") as InvoiceStatus | null
  const tenantId = sp.get("tenantId")
  const search = sp.get("search")?.trim()
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1)

  const where: Prisma.SubscriptionInvoiceWhereInput = {}

  if (status && VALID_STATUSES.includes(status)) {
    where.status = status
  }

  if (tenantId) where.tenant_id = tenantId

  if (search) {
    where.OR = [
      { invoice_number: { contains: search, mode: "insensitive" } },
      { tenant: { name: { contains: search, mode: "insensitive" } } },
      { tenant: { slug: { contains: search, mode: "insensitive" } } },
    ]
  }

  const { take, skip } = paginate(page, PAGE_SIZE)

  const [invoices, total] = await Promise.all([
    prisma.subscriptionInvoice.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    prisma.subscriptionInvoice.count({ where }),
  ])

  return NextResponse.json({
    invoices,
    meta: {
      total,
      page,
      page_size: PAGE_SIZE,
      total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    },
  })
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/super-admin/invoices
// Body: { tenant_id, plan_id, period_start, period_end, notes? }
// ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { user, error } = await requireSuperAdmin()
  if (error) return error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Body JSON tidak valid" },
      { status: 400 },
    )
  }

  const parsed = createInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { tenant_id, plan_id, period_start, period_end, notes } = parsed.data

  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenant_id },
      select: { id: true, slug: true, name: true },
    }),
    prisma.plan.findUnique({
      where: { id: plan_id },
      select: { id: true, price: true, name: true },
    }),
  ])

  if (!tenant) {
    return NextResponse.json(
      { error: "Not Found", message: "Tenant tidak ditemukan" },
      { status: 404 },
    )
  }

  if (!plan) {
    return NextResponse.json(
      { error: "Not Found", message: "Plan tidak ditemukan" },
      { status: 404 },
    )
  }

  const invoice = await generateInvoice({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    planPrice: plan.price.toString(),
    periodStart: new Date(period_start),
    periodEnd: new Date(period_end),
    notes,
  })

  await writeAuditLog({
    action: "invoice.created",
    userId: user!.id,
    tenantId: tenant.id,
    resource: `invoice:${invoice.id}`,
    metadata: {
      invoice_number: invoice.invoice_number,
      amount: invoice.amount.toString(),
      plan_name: plan.name,
    },
    req,
  })

  return NextResponse.json({ invoice }, { status: 201 })
}
