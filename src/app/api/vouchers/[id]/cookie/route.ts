import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { deleteHotspotCookie } from "@/services/mikrotik.service"

type Params = { params: { id: string } }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin()
  if (error) return error

  const voucher = await prisma.voucher.findUnique({ where: { id: params.id } })
  if (!voucher) {
    return NextResponse.json({ error: "Voucher tidak ditemukan" }, { status: 404 })
  }

  try {
    const result = await deleteHotspotCookie(voucher.code)
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
