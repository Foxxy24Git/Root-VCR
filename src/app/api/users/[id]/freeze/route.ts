import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

// PATCH /api/users/[id]/freeze — toggle freeze
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user: sessionUser, error } = await requireAdmin()
  if (error) return error

  const user = await prisma.user.findFirst({
    where: { id: params.id, tenant_id: sessionUser.tenantId! },
  })
  if (!user) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 })
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { is_frozen: !user.is_frozen },
    select: { id: true, email: true, is_frozen: true },
  })

  return NextResponse.json({
    user: updated,
    message: updated.is_frozen ? "Akun dibekukan" : "Pembekuan akun dicabut",
  })
}
