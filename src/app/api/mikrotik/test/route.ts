import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { testConnection } from "@/services/mikrotik.service"

// GET /api/mikrotik/test — admin only
export async function GET(req: NextRequest) {
  const { ctx, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const result = await testConnection(ctx.tenantId)
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
