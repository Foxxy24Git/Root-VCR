import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { updateProfileSchema } from "@/lib/validations/profile"

type Params = { params: { id: string } }

// GET /api/profiles/[id]
export async function GET(req: NextRequest, { params }: Params) {
  const { db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  const profile = await db.profile.findFirst({ where: { id: params.id } })
  if (!profile) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  return NextResponse.json({ profile })
}

// PUT /api/profiles/[id] — admin only
export async function PUT(req: NextRequest, { params }: Params) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 })
  }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const existing = await db.profile.findFirst({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  const profile = await db.profile.update({
    where: { id: params.id },
    data: parsed.data,
    select: {
      id: true, name: true, duration_days: true, duration_hours: true,
      price: true, speed_limit: true, mikrotik_profile: true, is_active: true, updated_at: true,
    },
  })

  return NextResponse.json({ profile })
}

// DELETE /api/profiles/[id] — admin only
export async function DELETE(req: NextRequest, { params }: Params) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const existing = await db.profile.findFirst({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  await db.profile.delete({ where: { id: params.id } })
  return NextResponse.json({ message: "Profile berhasil dihapus" })
}
