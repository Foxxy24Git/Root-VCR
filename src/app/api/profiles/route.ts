import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { createProfileSchema } from "@/lib/validations/profile"

// GET /api/profiles — semua role bisa lihat (scoped tenant)
export async function GET(req: NextRequest) {
  const { db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  const { searchParams } = req.nextUrl
  const activeOnly = searchParams.get("active") !== "false"

  const profiles = await db.profile.findMany({
    where: {
      ...(activeOnly ? { is_active: true } : {}),
    },
    orderBy: { price: "asc" },
    select: {
      id: true,
      name: true,
      duration_days: true,
      duration_hours: true,
      price: true,
      speed_limit: true,
      mikrotik_profile: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  })

  return NextResponse.json({ profiles })
}

// POST /api/profiles — admin only
export async function POST(req: NextRequest) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Bad Request", message: "Body tidak valid" }, { status: 400 })
  }

  const parsed = createProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const profile = await db.profile.create({
    data: {
      ...parsed.data,
      price: parsed.data.price,
      tenant_id: ctx.tenantId,
    },
    select: {
      id: true, name: true, duration_days: true, duration_hours: true,
      price: true, speed_limit: true, mikrotik_profile: true, is_active: true, created_at: true,
    },
  })

  return NextResponse.json({ profile }, { status: 201 })
}
