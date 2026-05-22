import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { extendTrialSchema } from "@/lib/validations/tenant"

type Params = { params: { id: string } }

// POST /api/super-admin/tenants/[id]/extend-trial
// Body: { additional_days: number }
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

  const parsed = extendTrialSchema.safeParse(body)
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
      {
        error: "Conflict",
        message: "Tenant sudah bukan trial — pakai endpoint extend (subscription) sebagai gantinya",
      },
      { status: 409 }
    )
  }

  // Base = tanggal trial_end_at saat ini (jika masih di masa depan) atau now (jika sudah lewat)
  const now = new Date()
  const baseDate =
    tenant.trial_end_at && tenant.trial_end_at.getTime() > now.getTime()
      ? tenant.trial_end_at
      : now

  const newTrialEnd = new Date(
    baseDate.getTime() + parsed.data.additional_days * 86_400_000
  )

  const updated = await prisma.tenant.update({
    where: { id: params.id },
    data: {
      trial_end_at: newTrialEnd,
      // Jika tenant sebelumnya di-suspend karena trial expired, auto-reaktifkan
      ...(tenant.is_active
        ? {}
        : { is_active: true, suspended_reason: null }),
    },
    select: {
      id: true,
      slug: true,
      is_trial: true,
      trial_end_at: true,
      is_active: true,
    },
  })

  await writeAuditLog({
    action: "tenant.trial.extended",
    userId: user.id,
    tenantId: updated.id,
    resource: `tenant:${updated.id}`,
    metadata: {
      additional_days: parsed.data.additional_days,
      previous_trial_end_at: tenant.trial_end_at,
      new_trial_end_at: newTrialEnd,
      reactivated: !tenant.is_active,
    },
    req,
  })

  return NextResponse.json({ tenant: updated })
}
