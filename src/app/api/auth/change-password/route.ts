import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
  newPassword: z.string().min(6, "Password minimal 6 karakter"),
})

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

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

    // Get current user from DB to check the hash
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!dbUser) {
      return NextResponse.json({ error: "Not Found", message: "User tidak ditemukan" }, { status: 404 })
    }

    const isMatch = await bcrypt.compare(currentPassword, dbUser.password_hash)
    if (!isMatch) {
      return NextResponse.json({ error: "Unauthorized", message: "Password saat ini salah" }, { status: 401 })
    }

    const newHash = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: newHash }
    })

    return NextResponse.json({ message: "Password berhasil diperbarui" })
  } catch {
    return NextResponse.json({ error: "Server Error", message: "Gagal memperbarui password" }, { status: 500 })
  }
}
