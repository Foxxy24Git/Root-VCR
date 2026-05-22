import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { testMikrotikConnection } from "@/lib/mikrotik"
import { writeAuditLog } from "@/lib/audit"

type Params = { params: { id: string } }

// POST /api/super-admin/tenants/[id]/test-mikrotik
export async function POST(req: NextRequest, { params }: Params) {
  const { user, error } = await requireSuperAdmin()
  if (error) return error

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    select: { id: true, slug: true },
  })
  if (!tenant) {
    return NextResponse.json(
      { error: "Not Found", message: "Tenant tidak ditemukan" },
      { status: 404 }
    )
  }

  const result = await testMikrotikConnection(tenant.id)

  await writeAuditLog({
    action: "tenant.mikrotik.tested",
    userId: user.id,
    tenantId: tenant.id,
    resource: `tenant:${tenant.id}`,
    metadata: { ok: result.ok, latencyMs: result.latencyMs, error: result.error },
    req,
  })

  return NextResponse.json(
    {
      ok: result.ok,
      message: result.ok
        ? `Terhubung! Latensi: ${result.latencyMs}ms`
        : result.error ?? "Gagal terhubung",
      latencyMs: result.latencyMs,
    },
    { status: result.ok ? 200 : 503 }
  )
}
