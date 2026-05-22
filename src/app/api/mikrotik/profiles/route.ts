import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { createMikrotikClient } from "@/lib/mikrotik"
import { parseSessionTimeout } from "@/services/mikrotik.service"

export async function GET(req: NextRequest) {
  const { ctx, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const client = await createMikrotikClient(ctx.tenantId)
  try {
    const conn = await client.connect()
    const profiles = await conn.menu("/ip/hotspot/user/profile").getAll()
    await client.disconnect()

    const mapped = (profiles as Array<Record<string, string | undefined>>).map((p) => {
      const dur = parseSessionTimeout(p["session-timeout"])
      return {
        id: p.id ?? null,
        name: p.name,
        speed_limit: p["rate-limit"] ?? null,
        duration_days: dur.days,
        duration_hours: dur.hours,
        session_timeout: p["session-timeout"] ?? null,
      }
    })
    return NextResponse.json({ profiles: mapped })
  } catch {
    await client.disconnect().catch(() => {})
    return NextResponse.json(
      { error: "MikroTik connection failed" },
      { status: 500 }
    )
  }
}

// DELETE /api/mikrotik/profiles?profileId=xxx — DB only, admin only
export async function DELETE(req: NextRequest) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const profileId = req.nextUrl.searchParams.get("profileId")
  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 })
  }

  console.log("DELETE DB ONLY:", profileId)

  try {
    // Verify profile belongs to tenant before delete (auto-injected)
    const existing = await db.profile.findFirst({ where: { id: profileId } })
    if (!existing) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 })
    }
    await db.profile.delete({ where: { id: profileId } })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Gagal menghapus profile"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
