import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Bad Request", message: "Form data tidak valid" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "Bad Request", message: "File wajib ada" }, { status: 400 })
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Bad Request", message: "Tipe file tidak didukung (jpg/png/webp/svg)" }, { status: 400 })
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Bad Request", message: "Ukuran file maksimal 2MB" }, { status: 400 })
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png"
  const filename = `logo-${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "logos")

  await mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadDir, filename), buffer)

  return NextResponse.json({ url: `/uploads/logos/${filename}` })
}
