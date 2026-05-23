import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateInvoice } from "@/lib/invoice"
import { writeAuditLog } from "@/lib/audit"

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Server Misconfigured", message: "CRON_SECRET belum di-set" },
      { status: 500 },
    )
  }

  const auth = req.headers.get("authorization") ?? ""
  const provided = auth.replace(/^Bearer\s+/i, "")
  if (provided !== secret) {
    return NextResponse.json(
      { error: "Unauthorized", message: "CRON_SECRET tidak cocok" },
      { status: 401 },
    )
  }

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000)

  const candidates = await prisma.tenant.findMany({
    where: {
      is_trial: false,
      is_active: true,
      subscription_end_at: { not: null, lt: sevenDaysFromNow },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      subscription_end_at: true,
      plan: {
        select: { id: true, price: true, duration_days: true, name: true },
      },
    },
  })

  const generated: string[] = []
  const skipped: string[] = []

  for (const tenant of candidates) {
    if (!tenant.plan || !tenant.subscription_end_at) {
      skipped.push(tenant.slug)
      continue
    }

    const nextPeriodStart = tenant.subscription_end_at
    const nextPeriodEnd = new Date(
      nextPeriodStart.getTime() + tenant.plan.duration_days * 86_400_000,
    )

    const existingInvoice = await prisma.subscriptionInvoice.findFirst({
      where: {
        tenant_id: tenant.id,
        status: { in: ["PENDING", "AWAITING_VERIFICATION"] },
        period_start: { gte: new Date(nextPeriodStart.getTime() - 86_400_000) },
      },
      select: { id: true },
    })

    if (existingInvoice) {
      skipped.push(tenant.slug)
      continue
    }

    const invoice = await generateInvoice({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      planPrice: tenant.plan.price.toString(),
      periodStart: nextPeriodStart,
      periodEnd: nextPeriodEnd,
      now,
    })

    await writeAuditLog({
      action: "invoice.auto_generated",
      tenantId: tenant.id,
      resource: `invoice:${invoice.id}`,
      metadata: {
        invoice_number: invoice.invoice_number,
        amount: invoice.amount.toString(),
        plan_name: tenant.plan.name,
        plan_price: tenant.plan.price.toString(),
        days_before_expiry: Math.ceil(
          (tenant.subscription_end_at.getTime() - now.getTime()) / 86_400_000,
        ),
      },
    })

    generated.push(invoice.invoice_number)
  }

  return NextResponse.json({
    ok: true,
    now,
    generated,
    skipped,
    counts: { generated: generated.length, skipped: skipped.length },
  })
}

export const POST = handle
export const GET = handle
