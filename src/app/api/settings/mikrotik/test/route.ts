import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { testMikrotikConnection } from "@/lib/mikrotik"

// POST /api/settings/mikrotik/test
export async function POST(req: NextRequest) {
  const { ctx, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await testMikrotikConnection(ctx.tenantId)
    return NextResponse.json(
      { ok: result.ok, message: result.ok ? `Terhubung! Latensi: ${result.latencyMs}ms` : result.error },
      { status: result.ok ? 200 : 503 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal terhubung ke MikroTik"
    return NextResponse.json({ ok: false, message }, { status: 503 })
  }
}
