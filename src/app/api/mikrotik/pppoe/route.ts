import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { getPPPoEStatus } from "@/services/mikrotik.service"

export async function GET() {
  const { user, error } = await requireAdmin()
  if (error) return error

  try {
    const data = await getPPPoEStatus(user.tenantId!)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[GET /api/mikrotik/pppoe] error:", message)
    return NextResponse.json(
      { error: "MikroTik connection failed", message },
      { status: 502 }
    )
  }
}
