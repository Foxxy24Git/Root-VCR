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
    await deleteHotspotCookie(voucher.code)
    return NextResponse.json({ message: "Cookie berhasil dihapus dari MikroTik" })
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus cookie dari MikroTik" },
      { status: 503 }
    )
  }
}
