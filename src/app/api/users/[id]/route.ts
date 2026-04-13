import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { updateUserSchema } from "@/lib/validations/user"
import bcrypt from "bcryptjs"
import { z } from "zod"

type Params = { params: { id: string } }

// GET /api/users/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { user: sessionUser, error } = await requireAuth()
  if (error) return error

  // Reseller hanya bisa lihat dirinya sendiri
  if (sessionUser.role === "reseller" && sessionUser.id !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      location: true,
      avatar_url: true,
      is_active: true,
      is_frozen: true,
      fee_percentage: true,
      created_at: true,
      updated_at: true,
      wallet: {
        select: { balance: true, total_topup: true, total_spent: true, updated_at: true },
      },
      reseller_profiles: {
        where: { is_enabled: true },
        select: { profile: { select: { id: true, name: true, price: true } } },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Not Found", message: "User tidak ditemukan" }, { status: 404 })
  }

  return NextResponse.json({ user })
}

// PUT /api/users/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const { user: sessionUser, error } = await requireAuth()
  if (error) return error

  // Reseller hanya bisa update dirinya sendiri, admin bisa update semua
  if (sessionUser.role === "reseller" && sessionUser.id !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Bad Request", message: "Body tidak valid" }, { status: 400 })
  }

  // Admin bisa set fee_percentage, reseller tidak
  const schema =
    sessionUser.role === "admin"
      ? updateUserSchema.extend({ fee_percentage: z.number().min(0).max(100).optional() })
      : updateUserSchema.omit({ fee_percentage: true })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 })
  }

  const data: Record<string, unknown> = { ...parsed.data }

  // Handle password change jika ada
  if ("password" in data && data.password) {
    data.password_hash = await bcrypt.hash(data.password as string, 12)
    delete data.password
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: {
      id: true, email: true, name: true, role: true,
      phone: true, location: true, fee_percentage: true,
      is_active: true, is_frozen: true, updated_at: true,
    },
  })

  return NextResponse.json({ user })
}

// DELETE /api/users/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user: sessionUser, error } = await requireAdmin()
  if (error) return error

  if (sessionUser.id === params.id) {
    return NextResponse.json(
      { error: "Forbidden", message: "Tidak bisa menghapus akun sendiri" },
      { status: 403 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 })
  }

  // Hapus semua relasi dalam transaksi agar tidak FK violation
  await prisma.$transaction(async (tx) => {
    // 1. Wallet logs (via wallet)
    const wallet = await tx.wallet.findUnique({ where: { user_id: params.id } })
    if (wallet) {
      await tx.walletLog.deleteMany({ where: { wallet_id: wallet.id } })
      await tx.wallet.delete({ where: { id: wallet.id } })
    }
    // 2. Reseller profiles
    await tx.resellerProfile.deleteMany({ where: { user_id: params.id } })
    // 3. Voucher: set user_id null (preserve history)
    await tx.voucher.updateMany({ where: { user_id: params.id }, data: { user_id: null } })
    // 4. WalletLog admin_id references
    await tx.walletLog.updateMany({ where: { admin_id: params.id }, data: { admin_id: null } })
    // 5. Hapus user
    await tx.user.delete({ where: { id: params.id } })
  })

  return NextResponse.json({ message: "User berhasil dihapus" })
}
