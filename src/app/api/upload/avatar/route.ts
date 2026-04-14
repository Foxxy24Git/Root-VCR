import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-helpers"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: NextRequest) {
  const { user: sessionUser, error } = await requireAuth()
  if (error) return error

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Bad Request", message: "Form data tidak valid" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  const userId = formData.get("userId") as string | null

  if (!file || !userId) {
    return NextResponse.json({ error: "Bad Request", message: "File dan userId wajib ada" }, { status: 400 })
  }

  // Reseller can only upload their own avatar
  if (sessionUser.role !== "admin" && userId !== sessionUser.id) {
    return NextResponse.json({ error: "Forbidden", message: "Tidak diizinkan" }, { status: 403 })
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Bad Request", message: "Tipe file tidak didukung (jpg/png/webp)" }, { status: 400 })
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Bad Request", message: "Ukuran file maksimal 2MB" }, { status: 400 })
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const filename = `${userId}-${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars")

  await mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadDir, filename), buffer)

  return NextResponse.json({ url: `/uploads/avatars/${filename}` })
}
