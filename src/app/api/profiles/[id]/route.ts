import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { updateProfileSchema } from "@/lib/validations/profile"

type Params = { params: { id: string } }

// GET /api/profiles/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth()
  if (error) return error

  const profile = await prisma.profile.findUnique({ where: { id: params.id } })
  if (!profile) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  return NextResponse.json({ profile })
}

// PUT /api/profiles/[id] — admin only
export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin()
  if (error) return error

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

  const existing = await prisma.profile.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  const profile = await prisma.profile.update({
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
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin()
  if (error) return error

  const existing = await prisma.profile.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  await prisma.profile.delete({ where: { id: params.id } })
  return NextResponse.json({ message: "Profile berhasil dihapus" })
}
