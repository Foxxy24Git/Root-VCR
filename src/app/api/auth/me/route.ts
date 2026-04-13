import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Session tidak ditemukan" },
      { status: 401 }
    )
  }

  // Ambil data terbaru dari DB (bukan hanya dari JWT)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
