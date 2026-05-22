import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { getPPPoEStatus } from "@/services/mikrotik.service"

export async function GET(req: NextRequest) {
  const { ctx, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const data = await getPPPoEStatus(ctx.tenantId)
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
