import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
})

export async function PUT(req: NextRequest) {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) return error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Body JSON tidak valid" },
      { status: 400 }
    )
  }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { name, email, phone, location, avatar_url } = parsed.data

  // Pastikan email unik dan tidak digunakan oleh user lain
  const emailExists = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      id: { not: user.id },
    },
    select: { id: true },
  })

  if (emailExists) {
    return NextResponse.json(
      { error: "Conflict", message: "Email sudah digunakan oleh pengguna lain" },
      { status: 409 }
    )
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        email,
        phone: phone || null,
        location: location || null,
        avatar_url: avatar_url || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        avatar_url: true,
        role: true,
      },
    })

    return NextResponse.json({
      message: "Profil berhasil diperbarui",
      user: updatedUser,
    })
  } catch (e) {
    console.error("Error updating super-admin profile:", e)
    return NextResponse.json(
      { error: "Server Error", message: "Gagal memperbarui profil" },
      { status: 500 }
    )
  }
}
