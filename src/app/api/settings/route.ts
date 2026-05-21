import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

// GET /api/settings -> retrieves all settings as a key-value pair object (scoped to tenant)
export async function GET() {
  const { user, error } = await requireAdmin()
  if (error) return error

  const tenantId = user.tenantId!
  const rows = await prisma.setting.findMany({ where: { tenant_id: tenantId } })
  const settings: Record<string, string | null> = {}

  rows.forEach(r => {
    settings[r.key] = r.value
  })

  return NextResponse.json({ settings })
}

// POST /api/settings -> Updates settings via an array of {key, value} objects
export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const tenantId = user.tenantId!

  let body: { updates: { key: string, value: string }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Bad Request", message: "Body tidak valid" }, { status: 400 })
  }

  if (!body.updates || !Array.isArray(body.updates)) {
    return NextResponse.json({ error: "Validation Error", message: "Updates array missing" }, { status: 422 })
  }

  try {
    await prisma.$transaction(
      body.updates.map((update) =>
        prisma.setting.upsert({
          where: { tenant_id_key: { tenant_id: tenantId, key: update.key } },
          update: { value: update.value, type: "string" },
          create: { tenant_id: tenantId, key: update.key, value: update.value, type: "string" },
        })
      )
    )

    return NextResponse.json({ message: "Pengaturan berhasil disimpan" })
  } catch {
     return NextResponse.json({ error: "Server Error", message: "Gagal menyimpan pengaturan" }, { status: 500 })
  }
}
