import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { testMikrotikConnection } from "@/lib/mikrotik"

// POST /api/settings/mikrotik/test
export async function POST() {
  const { user, error } = await requireAdmin()
  if (error) return error

  try {
    const result = await testMikrotikConnection(user.tenantId!)
    return NextResponse.json(
      { ok: result.ok, message: result.ok ? `Terhubung! Latensi: ${result.latencyMs}ms` : result.error },
      { status: result.ok ? 200 : 503 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal terhubung ke MikroTik"
    return NextResponse.json({ ok: false, message }, { status: 503 })
  }
}
