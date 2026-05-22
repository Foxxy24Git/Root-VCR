import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin, paginate } from "@/lib/api-helpers"
import { encrypt } from "@/lib/crypto"
import { writeAuditLog } from "@/lib/audit"
import { createTenantSchema } from "@/lib/validations/tenant"
import type { Prisma } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────
// GET /api/super-admin/tenants
//   ?page=1&limit=20
//   &status=trial|active|suspended|expired
//   &search=...    (cari di name/slug/owner_name/owner_email)
//   &planId=...
// ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const page = parseInt(sp.get("page") ?? "1")
  const limit = parseInt(sp.get("limit") ?? "20")
  const status = sp.get("status")
  const search = sp.get("search")?.trim() ?? ""
  const planId = sp.get("planId")

  const { take, skip } = paginate(page, limit)
  const now = new Date()

  const where: Prisma.TenantWhereInput = {}
  if (planId) where.plan_id = planId
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { owner_name: { contains: search, mode: "insensitive" } },
      { owner_email: { contains: search, mode: "insensitive" } },
    ]
  }

  switch (status) {
    case "trial":
      where.is_trial = true
      where.is_active = true
      break
    case "active":
      where.is_active = true
      where.is_trial = false
      break
    case "suspended":
      where.is_active = false
      break
    case "expired":
      // trial expired: trial_end_at < now AND is_trial
      where.is_trial = true
      where.trial_end_at = { lt: now }
      break
  }

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        owner_name: true,
        owner_email: true,
        owner_phone: true,
        mikrotik_host: true,
        mikrotik_last_test_at: true,
        mikrotik_last_test_ok: true,
        is_trial: true,
        trial_end_at: true,
        subscription_start_at: true,
        subscription_end_at: true,
        is_active: true,
        suspended_reason: true,
        max_resellers: true,
        max_vouchers_per_month: true,
        created_at: true,
        plan: { select: { id: true, name: true, price: true } },
        _count: { select: { users: true, vouchers: true } },
      },
    }),
    prisma.tenant.count({ where }),
  ])

  const enriched = tenants.map((t) => ({
    ...t,
    trial_days_left:
      t.is_trial && t.trial_end_at
        ? Math.max(0, Math.ceil((t.trial_end_at.getTime() - now.getTime()) / 86_400_000))
        : null,
    subscription_days_left:
      !t.is_trial && t.subscription_end_at
        ? Math.max(0, Math.ceil((t.subscription_end_at.getTime() - now.getTime()) / 86_400_000))
        : null,
  }))

  return NextResponse.json({
    tenants: enriched,
    pagination: { page, limit: take, total, pages: Math.ceil(total / take) },
  })
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/super-admin/tenants
// Buat tenant baru + Tenant Admin pertama. Default: trial 14 hari.
// ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { user, error } = await requireSuperAdmin()
  if (error) return error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Body JSON tidak valid" },
      { status: 400 }
    )
  }

  const parsed = createTenantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }
  const data = parsed.data

  // Cek slug unik
  const slugExists = await prisma.tenant.findUnique({ where: { slug: data.slug } })
  if (slugExists) {
    return NextResponse.json(
      { error: "Conflict", message: "Slug sudah dipakai tenant lain" },
      { status: 409 }
    )
  }

  // Cek admin_email unik (email user GLOBAL unique)
  const emailExists = await prisma.user.findUnique({ where: { email: data.admin_email } })
  if (emailExists) {
    return NextResponse.json(
      { error: "Conflict", message: "Email admin sudah dipakai user lain" },
      { status: 409 }
    )
  }

  // Resolve plan: pakai planId yang dikirim, atau default ke Trial plan
  const plan = data.plan_id
    ? await prisma.plan.findUnique({ where: { id: data.plan_id } })
    : await prisma.plan.findFirst({ where: { is_trial: true, is_active: true } })

  if (!plan) {
    return NextResponse.json(
      {
        error: "Bad Request",
        message: data.plan_id
          ? "Plan tidak ditemukan"
          : "Trial plan belum di-seed (jalankan seed-multitenant)",
      },
      { status: 400 }
    )
  }

  const now = new Date()
  const isTrial = plan.is_trial
  const trialEndAt = isTrial ? new Date(now.getTime() + plan.duration_days * 86_400_000) : null
  const subStart = isTrial ? null : now
  const subEnd = isTrial ? null : new Date(now.getTime() + plan.duration_days * 86_400_000)

  const mikrotikPasswordEnc = encrypt(data.mikrotik_password)
  const adminPasswordHash = await bcrypt.hash(data.admin_password, 12)

  // Buat tenant + admin user dalam 1 transaction
  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        owner_name: data.owner_name,
        owner_email: data.owner_email,
        owner_phone: data.owner_phone,
        mikrotik_host: data.mikrotik_host,
        mikrotik_port: data.mikrotik_port,
        mikrotik_username: data.mikrotik_username,
        mikrotik_password_enc: mikrotikPasswordEnc,
        mikrotik_use_ssl: data.mikrotik_use_ssl,
        plan_id: plan!.id,
        is_trial: isTrial,
        trial_end_at: trialEndAt,
        subscription_start_at: subStart,
        subscription_end_at: subEnd,
        is_active: true,
        max_resellers: data.max_resellers ?? plan!.max_resellers,
        max_vouchers_per_month:
          data.max_vouchers_per_month ?? plan!.max_vouchers_per_month,
        logo_url: data.logo_url ?? null,
        brand_color: data.brand_color ?? null,
        created_by: user.id,
      },
    })

    const admin = await tx.user.create({
      data: {
        email: data.admin_email,
        password_hash: adminPasswordHash,
        name: data.admin_name,
        role: "TENANT_ADMIN",
        is_active: true,
        tenant_id: tenant.id,
      },
      select: { id: true, email: true, name: true, role: true },
    })

    return { tenant, admin }
  })

  await writeAuditLog({
    action: "tenant.created",
    userId: user.id,
    tenantId: created.tenant.id,
    resource: `tenant:${created.tenant.id}`,
    metadata: {
      slug: created.tenant.slug,
      plan: plan.name,
      is_trial: isTrial,
      trial_end_at: trialEndAt,
      admin_email: data.admin_email,
    },
    req,
  })

  return NextResponse.json(
    {
      tenant: {
        ...created.tenant,
        mikrotik_password_enc: undefined,
      },
      admin: created.admin,
    },
    { status: 201 }
  )
}
