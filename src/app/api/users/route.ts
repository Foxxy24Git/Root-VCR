import { NextRequest, NextResponse } from "next/server"
import { getTenantScope, paginate } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { createUserSchema } from "@/lib/validations/user"
import bcrypt from "bcryptjs"
import type { Role } from "@prisma/client"

// GET /api/users — list users in current tenant (tenant admin only)
export async function GET(req: NextRequest) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "20")
  const roleParam = searchParams.get("role") // "TENANT_ADMIN" | "RESELLER" | null
  const search = searchParams.get("search") ?? ""

  const { take, skip } = paginate(page, limit)

  const where = {
    ...(roleParam ? { role: roleParam as Role } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
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
          select: { balance: true, total_topup: true, total_spent: true },
        },
      },
    }),
    db.user.count({ where }),
  ])

  return NextResponse.json({
    users,
    pagination: { page, limit: take, total, pages: Math.ceil(total / take) },
  })
}

// POST /api/users — buat reseller baru (tenant admin only)
export async function POST(req: NextRequest) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Bad Request", message: "Body tidak valid" }, { status: 400 })
  }

  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { email, password, name, phone, location, fee_percentage } = parsed.data

  // Cek email sudah ada (email @unique GLOBAL — pakai prisma raw, bukan db)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: "Conflict", message: "Email sudah digunakan" },
      { status: 409 }
    )
  }

  const password_hash = await bcrypt.hash(password, 12)

  const newUser = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        password_hash,
        name,
        phone: phone ?? null,
        location: location ?? null,
        fee_percentage: fee_percentage ?? 0,
        role: "RESELLER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        location: true,
        fee_percentage: true,
        is_active: true,
        is_frozen: true,
        created_at: true,
      },
    })

    // Auto-create wallet untuk reseller baru
    await tx.wallet.create({
      data: {
        user_id: created.id,
        balance: 0,
        total_topup: 0,
        total_spent: 0,
        tenant_id: ctx.tenantId,
      },
    })

    return created
  })

  return NextResponse.json({ user: newUser }, { status: 201 })
}
