import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const assignSchema = z.object({
  userId: z.string().uuid(),
  profileIds: z.array(z.string().uuid()),
})

// POST /api/profiles/assign — admin only
export async function POST(req: NextRequest) {
  const { user: sessionUser, error } = await requireAdmin()
  if (error) return error

  const tenantId = sessionUser.tenantId!

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Bad Request", message: "Body tidak valid" }, { status: 400 })
  }

  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { userId, profileIds } = parsed.data

  // Verify reseller belongs to this tenant
  const user = await prisma.user.findFirst({
    where: { id: userId, tenant_id: tenantId },
    select: { role: true },
  })
  if (!user || user.role !== "RESELLER") {
    return NextResponse.json({ error: "Not Found", message: "Reseller tidak ditemukan" }, { status: 404 })
  }

  // Verify all profileIds belong to this tenant
  if (profileIds.length > 0) {
    const validProfiles = await prisma.profile.findMany({
      where: { id: { in: profileIds }, tenant_id: tenantId },
      select: { id: true },
    })
    if (validProfiles.length !== profileIds.length) {
      return NextResponse.json(
        { error: "Validation Error", message: "Beberapa profile tidak valid" },
        { status: 422 }
      )
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.resellerProfile.deleteMany({ where: { user_id: userId } })

    if (profileIds.length > 0) {
      await tx.resellerProfile.createMany({
        data: profileIds.map((profile_id) => ({
          user_id: userId,
          profile_id,
          is_enabled: true,
          tenant_id: tenantId,
        })),
      })
    }
  })

  return NextResponse.json({ message: "Profil berhasil diassign" })
}

// GET /api/profiles/assign?userId=xxx — get current assignments for a reseller
export async function GET(req: NextRequest) {
  const { user: sessionUser, error } = await requireAdmin()
  if (error) return error

  const tenantId = sessionUser.tenantId!

  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "Bad Request", message: "userId diperlukan" }, { status: 400 })
  }

  const assignments = await prisma.resellerProfile.findMany({
    where: { user_id: userId, tenant_id: tenantId },
    select: { profile_id: true, is_enabled: true },
  })

  return NextResponse.json({ assignments })
}
