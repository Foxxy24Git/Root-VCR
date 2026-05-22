import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { deleteUser } from "@/services/mikrotik.service"

type Params = { params: { id: string } }

// GET /api/vouchers/[id]
export async function GET(req: NextRequest, { params }: Params) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  const voucher = await db.voucher.findFirst({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      profile: true,
    },
  })

  if (!voucher) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  // Reseller hanya bisa lihat voucher miliknya
  if (ctx.role === "RESELLER" && voucher.user_id !== ctx.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({ voucher })
}

// DELETE /api/vouchers/[id] — admin only
// Flow: delete from MikroTik FIRST, then hard-delete from DB
export async function DELETE(req: NextRequest, { params }: Params) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const voucher = await db.voucher.findFirst({ where: { id: params.id } })
  if (!voucher) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  if (voucher.status === "active") {
    return NextResponse.json(
      { error: "Conflict", message: "Voucher sedang aktif, tidak bisa dihapus" },
      { status: 409 }
    )
  }

  // 1. Delete from MikroTik first (source of truth)
  try {
    await deleteUser(ctx.tenantId, voucher.code)
    console.log("[DELETE voucher] Removed from MikroTik:", voucher.code)
  } catch (e) {
    console.error("[DELETE voucher] MikroTik error (continuing):", e)
  }

  // 2. Hard-delete from DB (tenant_id auto-injected by extension)
  await db.voucher.delete({ where: { id: params.id } })

  return NextResponse.json({ message: "Voucher dihapus" })
}
