import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { logoutHotspotUser, deleteHotspotCookie } from "@/services/mikrotik.service"

type Params = { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const tenantId = user.tenantId!

  const voucher = await prisma.voucher.findFirst({
    where: { id: params.id, tenant_id: tenantId },
  })
  if (!voucher) {
    return NextResponse.json({ error: "Voucher tidak ditemukan" }, { status: 404 })
  }

  try {
    console.log(`[API] logout voucher id="${params.id}" code="${voucher.code}" — calling logoutHotspotUser`)
    const result = await logoutHotspotUser(tenantId, voucher.code)
    console.log(`[API] logout voucher code="${voucher.code}" result=`, result)

    try {
      console.log(`[API] logout voucher code="${voucher.code}" — calling deleteHotspotCookie`)
      const cookieResult = await deleteHotspotCookie(tenantId, voucher.code)
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
