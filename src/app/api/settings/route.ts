import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { encrypt } from "@/lib/crypto"
import { prisma } from "@/lib/prisma"

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

  // Load MikroTik configurations from the Tenant model
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      mikrotik_host: true,
      mikrotik_port: true,
      mikrotik_username: true,
      mikrotik_password_enc: true,
    }
  })

  if (tenant) {
    settings.mikrotik_host = tenant.mikrotik_host || ""
    settings.mikrotik_api_port = String(tenant.mikrotik_port || 8728)
    settings.mikrotik_user = tenant.mikrotik_username || ""
    settings.mikrotik_pass = tenant.mikrotik_password_enc ? "••••••" : ""
  }

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

  const tenantUpdates: {
    mikrotik_host?: string
    mikrotik_port?: number
    mikrotik_username?: string
    mikrotik_password_enc?: string
  } = {}
  let hasTenantUpdates = false

  const settingsUpdates = body.updates.filter((update) => {
    if (update.key === "mikrotik_host") {
      tenantUpdates.mikrotik_host = update.value
      hasTenantUpdates = true
      return false
    }
    if (update.key === "mikrotik_api_port") {
      tenantUpdates.mikrotik_port = parseInt(update.value) || 8728
      hasTenantUpdates = true
      return false
    }
    if (update.key === "mikrotik_user") {
      tenantUpdates.mikrotik_username = update.value
      hasTenantUpdates = true
      return false
    }
    if (update.key === "mikrotik_pass") {
      if (update.value && update.value !== "••••••") {
        tenantUpdates.mikrotik_password_enc = encrypt(update.value)
        hasTenantUpdates = true
      }
      return false
    }
    return true
  })

  try {
    await db.$transaction(async (tx) => {
      // 1. Save standard settings
      if (settingsUpdates.length > 0) {
        await Promise.all(
          settingsUpdates.map((update) =>
            tx.setting.upsert({
              where: { tenant_id_key: { tenant_id: ctx.tenantId, key: update.key } },
              update: { value: update.value, type: "string" },
              create: { key: update.key, value: update.value, type: "string", tenant_id: ctx.tenantId },
            })
          )
        )
      }

      // 2. Update tenant model fields
      if (hasTenantUpdates) {
        await tx.tenant.update({
          where: { id: ctx.tenantId },
          data: tenantUpdates,
        })
      }
    })

    return NextResponse.json({ message: "Pengaturan berhasil disimpan" })
  } catch (err) {
     const msg = err instanceof Error ? err.message : "Gagal menyimpan pengaturan"
     return NextResponse.json({ error: "Server Error", message: msg }, { status: 500 })
  }
}
