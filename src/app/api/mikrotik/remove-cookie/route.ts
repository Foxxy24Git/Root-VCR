import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { deleteHotspotCookie } from "@/services/mikrotik.service"

export async function POST(req: NextRequest) {
  const { ctx, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let code: string
  try {
    const body = await req.json()
    code = body?.code
  } catch {
    return NextResponse.json({ success: false, error: "Body JSON tidak valid" }, { status: 400 })
  }

  if (!code || typeof code !== "string") {
    return NextResponse.json({ success: false, error: "Field 'code' wajib diisi" }, { status: 400 })
  }

  try {
    const result = await deleteHotspotCookie(ctx.tenantId, code)
    console.log(`[API] /mikrotik/remove-cookie code="${code}" result=`, result)
    return NextResponse.json({
      success: result.success,
      removed: result.removed,
      message: result.success
        ? `${result.removed} cookie berhasil dihapus dari MikroTik`
        : "Tidak ada cookie ditemukan untuk voucher ini",
    })
  } catch (err) {
    console.error(`[API] /mikrotik/remove-cookie error:`, err)
    return NextResponse.json(
      { success: false, error: `Gagal hapus cookie: ${err instanceof Error ? err.message : String(err)}` },
      { status: 503 }
    )
  }
}
