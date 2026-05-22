import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { updatePlanSchema } from "@/lib/validations/plan"
import type { Prisma } from "@prisma/client"

type Params = { params: { id: string } }

// ─────────────────────────────────────────────────────────────────────
// GET /api/super-admin/plans/[id]
// ─────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  const plan = await prisma.plan.findUnique({
    where: { id: params.id },
    include: { _count: { select: { tenants: true } } },
  })

  if (!plan) {
    return NextResponse.json(
      { error: "Not Found", message: "Plan tidak ditemukan" },
      { status: 404 },
    )
  }

  return NextResponse.json({ plan })
}

// ─────────────────────────────────────────────────────────────────────
// PATCH /api/super-admin/plans/[id]
// ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
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

  const parsed = updatePlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const existing = await prisma.plan.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json(
      { error: "Not Found", message: "Plan tidak ditemukan" },
      { status: 404 },
    )
  }

  const input = parsed.data

  // Cek name conflict (jika diubah)
  if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
    const dup = await prisma.plan.findFirst({
      where: {
        name: { equals: input.name, mode: "insensitive" },
        NOT: { id: params.id },
      },
      select: { id: true },
    })
    if (dup) {
      return NextResponse.json(
        { error: "Conflict", message: "Nama plan sudah dipakai plan lain" },
        { status: 409 },
      )
    }
  }

  const data: Prisma.PlanUpdateInput = {}
  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description
  if (input.duration_days !== undefined) data.duration_days = input.duration_days
  if (input.is_trial !== undefined) data.is_trial = input.is_trial
  if (input.max_resellers !== undefined) data.max_resellers = input.max_resellers
  if (input.max_vouchers_per_month !== undefined)
    data.max_vouchers_per_month = input.max_vouchers_per_month
  if (input.features !== undefined)
    data.features = input.features as unknown as Prisma.InputJsonValue
  if (input.is_active !== undefined) data.is_active = input.is_active

  // Harga: jika is_trial = true (baik existing maupun update), paksa 0
  const willBeTrial = input.is_trial ?? existing.is_trial
  if (input.price !== undefined) {
    data.price = willBeTrial ? 0 : input.price
  } else if (input.is_trial === true && Number(existing.price) !== 0) {
    data.price = 0
  }

  const plan = await prisma.plan.update({
    where: { id: params.id },
    data,
    include: { _count: { select: { tenants: true } } },
  })

  await writeAuditLog({
    action: "plan.updated",
    userId: user.id,
    resource: `plan:${plan.id}`,
    metadata: { fields: Object.keys(input) },
    req,
  })

  return NextResponse.json({ plan })
}

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/super-admin/plans/[id]
// Hanya boleh delete plan yang tidak punya tenant aktif terkait.
// Untuk plan yang sudah dipakai → soft-deactivate (is_active=false).
// ─────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const { user, error } = await requireSuperAdmin()
  if (error) return error

  const existing = await prisma.plan.findUnique({
    where: { id: params.id },
    include: { _count: { select: { tenants: true } } },
  })
  if (!existing) {
    return NextResponse.json(
      { error: "Not Found", message: "Plan tidak ditemukan" },
      { status: 404 },
    )
  }

  if (existing._count.tenants > 0) {
    // Soft-deactivate
    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: { is_active: false },
    })

    await writeAuditLog({
      action: "plan.deactivated",
      userId: user.id,
      resource: `plan:${plan.id}`,
      metadata: {
        name: plan.name,
        tenant_count: existing._count.tenants,
        reason: "Plan dipakai tenant — di-deactivate (bukan hapus)",
      },
      req,
    })

    return NextResponse.json({
      message: `Plan tidak bisa dihapus (${existing._count.tenants} tenant pakai). Plan di-non-aktifkan.`,
      plan,
      soft_deactivated: true,
    })
  }

  await prisma.plan.delete({ where: { id: params.id } })

  await writeAuditLog({
    action: "plan.deleted",
    userId: user.id,
    resource: `plan:${params.id}`,
    metadata: { name: existing.name },
    req,
  })

  return NextResponse.json({ message: "Plan dihapus" })
}
