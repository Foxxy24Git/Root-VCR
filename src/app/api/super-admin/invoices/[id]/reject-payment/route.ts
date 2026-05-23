import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { rejectPaymentSchema } from "@/lib/validations/invoice"
import { rejectPayment } from "@/lib/invoice"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, error } = await requireSuperAdmin()
  if (error) return error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Body JSON tidak valid" },
      { status: 400 },
    )
  }

  const parsed = rejectPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { reason } = parsed.data

  try {
    const updated = await rejectPayment({
      invoiceId: params.id,
      reason,
    })

    await writeAuditLog({
      action: "invoice.payment.rejected",
      userId: user!.id,
      tenantId: updated.tenant_id,
      resource: `invoice:${params.id}`,
      metadata: { reason, invoice_number: updated.invoice_number },
      req,
    })

    return NextResponse.json({ invoice: updated })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal menolak pembayaran"
    return NextResponse.json({ error: "Bad Request", message }, { status: 400 })
  }
}
