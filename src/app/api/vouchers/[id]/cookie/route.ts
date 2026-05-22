import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { deleteHotspotCookie } from "@/services/mikrotik.service"

type Params = { params: { id: string } }

export async function DELETE(req: NextRequest, { params }: Params) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const voucher = await db.voucher.findFirst({ where: { id: params.id } })
  if (!voucher) {
    return NextResponse.json({ error: "Voucher tidak ditemukan" }, { status: 404 })
  }

  try {
    const result = await deleteHotspotCookie(ctx.tenantId, voucher.code)
    console.log(`[API] delete cookie voucher code="${voucher.code}" result=`, result)
    return NextResponse.json({
      success: result.success,
      removed: result.removed,
      message: result.success
        ? `${result.removed} cookie berhasil dihapus dari MikroTik`
        : "Tidak ada cookie ditemukan",
    })
  } catch (err) {
    console.error(`[API] delete cookie error:`, err)
    return NextResponse.json(
      { success: false, error: "Gagal menghapus cookie dari MikroTik" },
      { status: 503 }
    )
  }
}
