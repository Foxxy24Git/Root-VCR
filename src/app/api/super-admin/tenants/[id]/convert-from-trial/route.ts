import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { convertFromTrialSchema } from "@/lib/validations/tenant"

type Params = { params: { id: string } }

// POST /api/super-admin/tenants/[id]/convert-from-trial
// Body: { plan_id: string }
// Effect: isTrial=false, plan=plan_id, subscription_start_at=now,
//         subscription_end_at=now+plan.duration_days, trial_end_at=null.
export async function POST(req: NextRequest, { params }: Params) {
  const { user, error } = await requireSuperAdmin()
  if (error) return error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Body JSON tidak valid" },
      { status: 400 }
    )
  }

  const parsed = convertFromTrialSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: params.id } })
  if (!tenant) {
    return NextResponse.json(
      { error: "Not Found", message: "Tenant tidak ditemukan" },
      { status: 404 }
    )
  }

  if (!tenant.is_trial) {
    return NextResponse.json(
      { error: "Conflict", message: "Tenant bukan trial — sudah berbayar" },
      { status: 409 }
    )
  }

  const plan = await prisma.plan.findUnique({ where: { id: parsed.data.plan_id } })
  if (!plan) {
    return NextResponse.json(
      { error: "Bad Request", message: "Plan tidak ditemukan" },
      { status: 400 }
    )
  }
  if (plan.is_trial) {
    return NextResponse.json(
      {
        error: "Bad Request",
        message: "plan_id menunjuk ke plan trial — pilih plan berbayar",
      },
      { status: 400 }
    )
  }
  if (!plan.is_active) {
    return NextResponse.json(
      { error: "Bad Request", message: "Plan sudah tidak aktif" },
      { status: 400 }
    )
  }

  const now = new Date()
  const subEnd = new Date(now.getTime() + plan.duration_days * 86_400_000)

  const updated = await prisma.tenant.update({
    where: { id: params.id },
    data: {
      is_trial: false,
      trial_end_at: null,
      plan_id: plan.id,
      subscription_start_at: now,
      subscription_end_at: subEnd,
      max_resellers: plan.max_resellers,
      max_vouchers_per_month: plan.max_vouchers_per_month,
      // Auto-reaktifkan jika sebelumnya di-suspend karena trial expired
      ...(tenant.is_active ? {} : { is_active: true, suspended_reason: null }),
    },
    select: {
      id: true,
      slug: true,
      is_trial: true,
      is_active: true,
      subscription_start_at: true,
      subscription_end_at: true,
      max_resellers: true,
      max_vouchers_per_month: true,
      plan: { select: { id: true, name: true, price: true } },
    },
  })

  await writeAuditLog({
    action: "tenant.converted_from_trial",
    userId: user.id,
    tenantId: updated.id,
    resource: `tenant:${updated.id}`,
    metadata: {
      plan_id: plan.id,
      plan_name: plan.name,
      plan_price: plan.price.toString(),
      subscription_start_at: now,
      subscription_end_at: subEnd,
      reactivated: !tenant.is_active,
    },
    req,
  })

  return NextResponse.json({ tenant: updated })
}
