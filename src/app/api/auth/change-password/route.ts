import { NextRequest, NextResponse } from "next/server"
import { getTenantContext, UnauthorizedError, ForbiddenError } from "@/lib/tenant-context"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
  newPassword: z.string().min(6, "Password minimal 6 karakter"),
})

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await getTenantContext()
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized", message: e.message }, { status: 401 })
    }
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden", message: e.message }, { status: 403 })
    }
    throw e
  }

  try {
    const body = await req.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { currentPassword, newPassword } = parsed.data

    // Pakai prisma raw karena user mungkin SUPER_ADMIN (tenant_id NULL)
    const dbUser = await prisma.user.findUnique({ where: { id: ctx.userId } })

    if (!dbUser) {
      return NextResponse.json({ error: "Not Found", message: "User tidak ditemukan" }, { status: 404 })
    }

    const isMatch = await bcrypt.compare(currentPassword, dbUser.password_hash)
    if (!isMatch) {
      return NextResponse.json({ error: "Unauthorized", message: "Password saat ini salah" }, { status: 401 })
    }

    const newHash = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: ctx.userId },
      data: { password_hash: newHash }
    })

    return NextResponse.json({ message: "Password berhasil diperbarui" })
  } catch {
    return NextResponse.json({ error: "Server Error", message: "Gagal memperbarui password" }, { status: 500 })
  }
}
