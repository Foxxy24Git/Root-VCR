import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { encrypt } from "@/lib/crypto"
import { writeAuditLog } from "@/lib/audit"
import { updateTenantSchema } from "@/lib/validations/tenant"

type Params = { params: { id: string } }

const TENANT_DETAIL_SELECT = {
  id: true,
  name: true,
  slug: true,
  owner_name: true,
  owner_email: true,
  owner_phone: true,
  mikrotik_host: true,
  mikrotik_port: true,
  mikrotik_username: true,
  mikrotik_use_ssl: true,
  mikrotik_last_test_at: true,
  mikrotik_last_test_ok: true,
  mikrotik_last_edited_by: true,
  mikrotik_last_edited_at: true,
  is_trial: true,
  trial_end_at: true,
  subscription_start_at: true,
  subscription_end_at: true,
  is_active: true,
  suspended_reason: true,
  max_resellers: true,
  max_vouchers_per_month: true,
  logo_url: true,
  brand_color: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  plan: {
    select: {
      id: true,
      name: true,
      price: true,
      duration_days: true,
      is_trial: true,
    },
  },
  _count: { select: { users: true, vouchers: true, profiles: true, invoices: true } },
} as const

// ─────────────────────────────────────────────────────────────────────
// GET /api/super-admin/tenants/[id]
// ─────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    select: TENANT_DETAIL_SELECT,
  })

  if (!tenant) {
    return NextResponse.json(
      { error: "Not Found", message: "Tenant tidak ditemukan" },
      { status: 404 }
    )
  }

  const now = new Date()
  const trialDaysLeft =
    tenant.is_trial && tenant.trial_end_at
      ? Math.max(0, Math.ceil((tenant.trial_end_at.getTime() - now.getTime()) / 86_400_000))
      : null
  const subDaysLeft =
    !tenant.is_trial && tenant.subscription_end_at
      ? Math.max(
          0,
          Math.ceil((tenant.subscription_end_at.getTime() - now.getTime()) / 86_400_000)
        )
      : null

  return NextResponse.json({
    tenant: {
      ...tenant,
      trial_days_left: trialDaysLeft,
      subscription_days_left: subDaysLeft,
      trial_expired: tenant.is_trial && tenant.trial_end_at
        ? tenant.trial_end_at.getTime() < now.getTime()
        : false,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────
// PATCH /api/super-admin/tenants/[id]
// Update tenant; slug & trial/subscription fields tidak boleh via PATCH.
// ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
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

  const parsed = updateTenantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const existing = await prisma.tenant.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json(
      { error: "Not Found", message: "Tenant tidak ditemukan" },
      { status: 404 }
    )
  }

  const { mikrotik_password, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }

  // Track perubahan MikroTik config (untuk audit + last_edited_*)
  const mikrotikTouched =
    mikrotik_password !== undefined ||
    rest.mikrotik_host !== undefined ||
    rest.mikrotik_port !== undefined ||
    rest.mikrotik_username !== undefined ||
    rest.mikrotik_use_ssl !== undefined

  if (mikrotik_password) {
    data.mikrotik_password_enc = encrypt(mikrotik_password)
  }

  if (mikrotikTouched) {
    data.mikrotik_last_edited_by = user.id
    data.mikrotik_last_edited_at = new Date()
  }

  const updated = await prisma.tenant.update({
    where: { id: params.id },
    data,
    select: TENANT_DETAIL_SELECT,
  })

  await writeAuditLog({
    action: "tenant.updated",
    userId: user.id,
    tenantId: updated.id,
    resource: `tenant:${updated.id}`,
    metadata: {
      fields: Object.keys(parsed.data),
      mikrotik_changed: mikrotikTouched,
    },
    req,
  })

  return NextResponse.json({ tenant: updated })
}

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/super-admin/tenants/[id]
// Soft delete: set is_active=false + rename slug agar bisa dipakai ulang.
// Tidak menghapus data (data tenant tetap, hanya non-aktif).
// ─────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const { user, error } = await requireSuperAdmin()
  if (error) return error

  const existing = await prisma.tenant.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json(
      { error: "Not Found", message: "Tenant tidak ditemukan" },
      { status: 404 }
    )
  }

  if (existing.slug.endsWith("-deleted")) {
    return NextResponse.json(
      { error: "Conflict", message: "Tenant sudah dihapus" },
      { status: 409 }
    )
  }

  const archivedSlug = `${existing.slug}-deleted-${Date.now()}`

  const updated = await prisma.tenant.update({
    where: { id: params.id },
    data: {
      is_active: false,
      suspended_reason: "Deleted by Super Admin",
      slug: archivedSlug,
    },
    select: { id: true, slug: true, is_active: true, suspended_reason: true },
  })

  await writeAuditLog({
    action: "tenant.deleted",
    userId: user.id,
    tenantId: updated.id,
    resource: `tenant:${updated.id}`,
    metadata: { original_slug: existing.slug, archived_slug: archivedSlug },
    req,
  })

  return NextResponse.json({
    message: "Tenant berhasil di-soft-delete",
    tenant: updated,
  })
}
