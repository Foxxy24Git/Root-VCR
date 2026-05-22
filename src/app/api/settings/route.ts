import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"

// GET /api/settings -> retrieves all settings as a key-value pair object (scoped to tenant)
export async function GET(req: NextRequest) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const rows = await db.setting.findMany()
  const settings: Record<string, string | null> = {}

  rows.forEach(r => {
    settings[r.key] = r.value
  })

  return NextResponse.json({ settings })
}

// POST /api/settings -> Updates settings via an array of {key, value} objects
export async function POST(req: NextRequest) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

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
    await db.$transaction(
      body.updates.map((update) =>
        db.setting.upsert({
          where: { tenant_id_key: { tenant_id: ctx.tenantId, key: update.key } },
          update: { value: update.value, type: "string" },
          create: { key: update.key, value: update.value, type: "string", tenant_id: ctx.tenantId },
        })
      )
    )

    return NextResponse.json({ message: "Pengaturan berhasil disimpan" })
  } catch {
     return NextResponse.json({ error: "Server Error", message: "Gagal menyimpan pengaturan" }, { status: 500 })
  }
}
