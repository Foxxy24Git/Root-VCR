import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { getHotspotProfiles, parseSessionTimeout } from "@/services/mikrotik.service"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const profiles = await getHotspotProfiles()
    const mapped = profiles.map((p) => {
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
    return NextResponse.json(
      { error: "Gagal mengambil profile dari MikroTik" },
      { status: 503 }
    )
  }
}
