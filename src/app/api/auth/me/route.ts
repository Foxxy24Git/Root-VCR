import { NextResponse } from "next/server"
import { getTenantContext, UnauthorizedError, ForbiddenError } from "@/lib/tenant-context"
import { prisma } from "@/lib/prisma"

export async function GET() {
  let ctx
  try {
    ctx = await getTenantContext()
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: "Unauthorized", message: e.message },
        { status: 401 }
      )
    }
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden", message: e.message }, { status: 403 })
    }
    throw e
  }

  // Ambil data terbaru dari DB (bukan hanya dari JWT).
  // Pakai prisma raw karena SUPER_ADMIN punya tenant_id NULL — tidak bisa di-scope.
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      location: true,
      avatar_url: true,
      is_active: true,
      is_frozen: true,
      fee_percentage: true,
      created_at: true,
    },
  })

  if (!user) {
    return NextResponse.json(
      { error: "Not Found", message: "User tidak ditemukan" },
      { status: 404 }
    )
  }

  if (!user.is_active || user.is_frozen) {
    return NextResponse.json(
      { error: "Forbidden", message: "Akun dinonaktifkan atau dibekukan" },
      { status: 403 }
    )
  }

  return NextResponse.json({ user })
}
