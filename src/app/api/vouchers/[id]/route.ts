import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

type Params = { params: { id: string } }

// GET /api/vouchers/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await requireAuth()
  if (error) return error

  const voucher = await prisma.voucher.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      profile: true,
    },
  })

  if (!voucher) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  // Reseller hanya bisa lihat voucher miliknya
  if (user.role === "reseller" && voucher.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({ voucher })
}

// DELETE /api/vouchers/[id] — admin only, hanya voucher unused
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin()
  if (error) return error

  const voucher = await prisma.voucher.findUnique({ where: { id: params.id } })
  if (!voucher) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  if (voucher.status === "active") {
    return NextResponse.json(
      { error: "Conflict", message: "Voucher sedang aktif, tidak bisa dihapus" },
      { status: 409 }
    )
  }

  // Soft-delete: set status deleted
  const updated = await prisma.voucher.update({
    where: { id: params.id },
    data: { status: "deleted" },
    select: { id: true, code: true, status: true },
  })

  return NextResponse.json({ voucher: updated, message: "Voucher dihapus" })
}
