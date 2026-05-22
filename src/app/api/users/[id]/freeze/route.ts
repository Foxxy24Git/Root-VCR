import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"

// PATCH /api/users/[id]/freeze — toggle freeze
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const user = await db.user.findFirst({ where: { id: params.id } })
  if (!user) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 })
  }

  const updated = await db.user.update({
    where: { id: params.id },
    data: { is_frozen: !user.is_frozen },
    select: { id: true, email: true, is_frozen: true },
  })

  return NextResponse.json({
    user: updated,
    message: updated.is_frozen ? "Akun dibekukan" : "Pembekuan akun dicabut",
  })
}
