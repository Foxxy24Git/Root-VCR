import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { testConnection } from "@/services/mikrotik.service"

// GET /api/mikrotik/test — admin only
export async function GET() {
  const { user, error } = await requireAdmin()
  if (error) return error

  const result = await testConnection(user.tenantId!)

  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
