import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { updateUserSchema } from "@/lib/validations/user"
import bcrypt from "bcryptjs"
import { z } from "zod"

type Params = { params: { id: string } }

// GET /api/users/[id]
export async function GET(req: NextRequest, { params }: Params) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  // Reseller hanya bisa lihat dirinya sendiri
  if (ctx.role === "RESELLER" && ctx.userId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const user = await db.user.findFirst({
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

// PATCH /api/users/[id] — admin only
export async function PATCH(req: NextRequest, { params }: Params) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Bad Request", message: "Body tidak valid" }, { status: 400 })
  }

  const adminPatchSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email("Email tidak valid").optional(),
    phone: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    fee_percentage: z.number().min(0).max(100).optional(),
    avatar_url: z.string().nullable().optional(),
    is_frozen: z.boolean().optional(),
    is_active: z.boolean().optional(),
    password: z.string().min(6, "Password minimal 6 karakter").optional(),
  })

  const parsed = adminPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const existing = await db.user.findFirst({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  const { password, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }

  if (password) {
    data.password_hash = await bcrypt.hash(password, 12)
  }

  const user = await db.user.update({
    where: { id: params.id },
    data,
    select: {
      id: true, email: true, name: true, role: true,
      phone: true, location: true, avatar_url: true,
      fee_percentage: true, is_active: true, is_frozen: true, updated_at: true,
    },
  })

  return NextResponse.json({ user })
}

// PUT /api/users/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  // Reseller hanya bisa update dirinya sendiri, tenant admin bisa update semua
  if (ctx.role === "RESELLER" && ctx.userId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Bad Request", message: "Body tidak valid" }, { status: 400 })
  }

  const avatarExt = z.object({ avatar_url: z.string().nullable().optional() })
  const schema =
    ctx.role === "TENANT_ADMIN" || ctx.role === "SUPER_ADMIN"
      ? updateUserSchema.merge(avatarExt).extend({ fee_percentage: z.number().min(0).max(100).optional() })
      : updateUserSchema.merge(avatarExt).omit({ fee_percentage: true })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const existing = await db.user.findFirst({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 })
  }

  const data: Record<string, unknown> = { ...parsed.data }

  if ("password" in data && data.password) {
    data.password_hash = await bcrypt.hash(data.password as string, 12)
    delete data.password
  }

  const user = await db.user.update({
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
export async function DELETE(req: NextRequest, { params }: Params) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (ctx.userId === params.id) {
    return NextResponse.json(
      { error: "Forbidden", message: "Tidak bisa menghapus akun sendiri" },
      { status: 403 }
    )
  }

  const existing = await db.user.findFirst({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 })
  }

  await db.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { user_id: params.id } })
    if (wallet) {
      await tx.walletLog.deleteMany({ where: { wallet_id: wallet.id } })
      await tx.wallet.delete({ where: { id: wallet.id } })
    }
    await tx.resellerProfile.deleteMany({ where: { user_id: params.id } })
    await tx.voucher.updateMany({ where: { user_id: params.id }, data: { user_id: null } })
    await tx.walletLog.updateMany({ where: { admin_id: params.id }, data: { admin_id: null } })
    await tx.user.delete({ where: { id: params.id } })
  })

  return NextResponse.json({ message: "User berhasil dihapus" })
}
