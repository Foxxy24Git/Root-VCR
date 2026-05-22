import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { logoutHotspotUser, deleteHotspotCookie } from "@/services/mikrotik.service"

type Params = { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
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
    console.log(`[API] logout voucher id="${params.id}" code="${voucher.code}" — calling logoutHotspotUser`)
    const result = await logoutHotspotUser(ctx.tenantId, voucher.code)
    console.log(`[API] logout voucher code="${voucher.code}" result=`, result)

    try {
      console.log(`[API] logout voucher code="${voucher.code}" — calling deleteHotspotCookie`)
      const cookieResult = await deleteHotspotCookie(ctx.tenantId, voucher.code)
      console.log(`[API] delete cookie voucher code="${voucher.code}" result=`, cookieResult)
    } catch (cookieErr) {
      console.warn(`[API] delete cookie failed (non-fatal):`, cookieErr)
    }

    return NextResponse.json({
      success: true,
      message: "Voucher logged out",
    })
  } catch (err) {
    console.error(`[API] logout error:`, err)
    return NextResponse.json(
      { success: false, error: "Gagal logout sesi dari MikroTik" },
      { status: 503 }
    )
  }
}
