import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { suspendTenantSchema } from "@/lib/validations/tenant"

type Params = { params: { id: string } }

// POST /api/super-admin/tenants/[id]/suspend
export async function POST(req: NextRequest, { params }: Params) {
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

  const parsed = suspendTenantSchema.safeParse(body)
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

  if (!existing.is_active) {
    return NextResponse.json(
      { error: "Conflict", message: "Tenant sudah dalam status suspended" },
      { status: 409 }
    )
  }

  const updated = await prisma.tenant.update({
    where: { id: params.id },
    data: { is_active: false, suspended_reason: parsed.data.reason },
    select: { id: true, slug: true, is_active: true, suspended_reason: true },
  })

  await writeAuditLog({
    action: "tenant.suspended",
    userId: user.id,
    tenantId: updated.id,
    resource: `tenant:${updated.id}`,
    metadata: { reason: parsed.data.reason },
    req,
  })

  return NextResponse.json({ tenant: updated })
}
