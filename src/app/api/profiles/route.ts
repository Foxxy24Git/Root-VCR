import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { createProfileSchema } from "@/lib/validations/profile"

// GET /api/profiles — semua role bisa lihat
export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = req.nextUrl
  const activeOnly = searchParams.get("active") !== "false"

  const profiles = await prisma.profile.findMany({
    where: activeOnly ? { is_active: true } : {},
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
  const { error } = await requireAdmin()
  if (error) return error

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

  const profile = await prisma.profile.create({
    data: {
      ...parsed.data,
      price: parsed.data.price,
    },
    select: {
      id: true, name: true, duration_days: true, duration_hours: true,
      price: true, speed_limit: true, mikrotik_profile: true, is_active: true, created_at: true,
    },
  })

  return NextResponse.json({ profile }, { status: 201 })
}
