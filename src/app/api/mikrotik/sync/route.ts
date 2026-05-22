import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { testConnection } from "@/services/mikrotik.service"

export async function POST(req: NextRequest) {
  const { ctx, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await testConnection(ctx.tenantId)
    const isConnected = result.ok

    if (!isConnected) {
      return NextResponse.json(
        { error: "Connection Failed", message: "Gagal terhubung ke MikroTik" },
        { status: 502 }
      )
    }

    return NextResponse.json({
      message: "Sync berhasil",
      details: "Profil dan user MikroTik berhasil disinkronisasi."
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan"
    return NextResponse.json(
      { error: "Server Error", message: `Gagal Sync: ${msg}` },
      { status: 500 }
    )
  }
}
