import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { createPlanSchema } from "@/lib/validations/plan"
import type { Prisma } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────
// GET /api/super-admin/plans
//   ?includeInactive=true  (default: false → cuma plan aktif)
//   ?isTrial=true|false
// ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const includeInactive = sp.get("includeInactive") === "true"
  const isTrialParam = sp.get("isTrial")

  const where: Prisma.PlanWhereInput = {}
  if (!includeInactive) where.is_active = true
  if (isTrialParam === "true") where.is_trial = true
  if (isTrialParam === "false") where.is_trial = false

  const plans = await prisma.plan.findMany({
    where,
    orderBy: [{ is_trial: "desc" }, { price: "asc" }, { created_at: "asc" }],
    include: {
      _count: { select: { tenants: true } },
    },
  })

  return NextResponse.json({ plans })
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/super-admin/plans
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

  const parsed = createPlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }
  const data = parsed.data

  // Nama plan harus unik (case-insensitive)
  const nameExists = await prisma.plan.findFirst({
    where: { name: { equals: data.name, mode: "insensitive" } },
    select: { id: true },
  })
  if (nameExists) {
    return NextResponse.json(
      { error: "Conflict", message: "Nama plan sudah dipakai" },
      { status: 409 },
    )
  }

  // Jika plan trial: pastikan harga = 0 untuk konsistensi
  const finalPrice = data.is_trial ? 0 : data.price

  const plan = await prisma.plan.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      price: finalPrice,
      duration_days: data.duration_days,
      is_trial: data.is_trial,
      max_resellers: data.max_resellers,
      max_vouchers_per_month: data.max_vouchers_per_month,
      features: data.features as unknown as Prisma.InputJsonValue,
      is_active: data.is_active,
    },
  })

  await writeAuditLog({
    action: "plan.created",
    userId: user.id,
    resource: `plan:${plan.id}`,
    metadata: {
      name: plan.name,
      is_trial: plan.is_trial,
      price: plan.price.toString(),
    },
    req,
  })

  return NextResponse.json({ plan }, { status: 201 })
}
