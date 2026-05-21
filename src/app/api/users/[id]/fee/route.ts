import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const feeSchema = z.object({
  fee_percentage: z.number().min(0).max(100),
})

// PATCH /api/users/[id]/fee — set fee percentage
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user: sessionUser, error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 })
  }

  const parsed = feeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation Error", issues: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const user = await prisma.user.findFirst({
    where: { id: params.id, tenant_id: sessionUser.tenantId! },
  })
  if (!user) return NextResponse.json({ error: "Not Found" }, { status: 404 })

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { fee_percentage: parsed.data.fee_percentage },
    select: { id: true, email: true, fee_percentage: true },
  })

  return NextResponse.json({ user: updated })
}
