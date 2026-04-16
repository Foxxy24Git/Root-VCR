import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { deleteUser } from "@/services/mikrotik.service"

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

// DELETE /api/vouchers/[id] — admin only
// Flow: delete from MikroTik FIRST, then hard-delete from DB
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

  // 1. Delete from MikroTik first (source of truth)
  try {
    await deleteUser(voucher.code)
    console.log("[DELETE voucher] Removed from MikroTik:", voucher.code)
  } catch (e) {
    console.error("[DELETE voucher] MikroTik error (continuing):", e)
    // Non-fatal: user might already be gone from MT (e.g. deleted via Winbox)
  }

  // 2. Hard-delete from DB
  await prisma.voucher.delete({ where: { id: params.id } })

  return NextResponse.json({ message: "Voucher dihapus" })
}
