import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { createMikrotikClient } from "@/lib/mikrotik"
import { parseSessionTimeout } from "@/services/mikrotik.service"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const client = await createMikrotikClient()
  try {
    const conn = await client.connect()
    const profiles = await conn.menu("/ip/hotspot/user/profile").getAll()
    await client.disconnect()

    const mapped = (profiles as Array<Record<string, string | undefined>>).map((p) => {
      const dur = parseSessionTimeout(p["session-timeout"])
      return {
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
