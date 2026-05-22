import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"

type Params = { params: { id: string } }

// POST /api/super-admin/tenants/[id]/activate
// Re-aktifkan tenant yang sebelumnya suspended.
export async function POST(req: NextRequest, { params }: Params) {
  const { user, error } = await requireSuperAdmin()
  if (error) return error

  const existing = await prisma.tenant.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json(
      { error: "Not Found", message: "Tenant tidak ditemukan" },
      { status: 404 }
    )
  }

  if (existing.is_active) {
    return NextResponse.json(
      { error: "Conflict", message: "Tenant sudah aktif" },
      { status: 409 }
    )
  }

  const updated = await prisma.tenant.update({
    where: { id: params.id },
    data: { is_active: true, suspended_reason: null },
    select: {
      id: true,
      slug: true,
      is_active: true,
      suspended_reason: true,
      is_trial: true,
      trial_end_at: true,
      subscription_end_at: true,
    },
  })

  await writeAuditLog({
    action: "tenant.activated",
    userId: user.id,
    tenantId: updated.id,
    resource: `tenant:${updated.id}`,
    metadata: { previous_reason: existing.suspended_reason },
    req,
  })

  return NextResponse.json({ tenant: updated })
}
