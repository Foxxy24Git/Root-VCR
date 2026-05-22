import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { z } from "zod"

const feeSchema = z.object({
  fee_percentage: z.number().min(0).max(100),
})

// PATCH /api/users/[id]/fee — set fee percentage
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 })
  }

  const parsed = feeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation Error", issues: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const user = await db.user.findFirst({ where: { id: params.id } })
  if (!user) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  const updated = await db.user.update({
    where: { id: params.id },
    data: { fee_percentage: parsed.data.fee_percentage },
    select: { id: true, email: true, fee_percentage: true },
  })

  return NextResponse.json({ user: updated })
}
