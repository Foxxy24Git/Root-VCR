import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { logoutHotspotUser } from "@/services/mikrotik.service"

type Params = { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin()
  if (error) return error

  const voucher = await prisma.voucher.findUnique({ where: { id: params.id } })
  if (!voucher) {
    return NextResponse.json({ error: "Voucher tidak ditemukan" }, { status: 404 })
  }

  try {
    await logoutHotspotUser(voucher.code)
    return NextResponse.json({ message: "Sesi aktif berhasil di-logout dari MikroTik" })
  } catch {
    return NextResponse.json(
      { error: "Gagal logout sesi dari MikroTik" },
      { status: 503 }
    )
  }
}
