import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { verifyPaymentSchema } from "@/lib/validations/invoice"
import { verifyPayment } from "@/lib/invoice"

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

  const parsed = verifyPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { payment_method, paid_at, notes } = parsed.data

  try {
    const updated = await verifyPayment({
      invoiceId: params.id,
      verifiedBy: user!.id,
      paymentMethod: payment_method,
      paidAt: new Date(paid_at),
      notes,
    })

    await writeAuditLog({
      action: "invoice.payment.verified",
      userId: user!.id,
      tenantId: updated.tenant_id,
      resource: `invoice:${params.id}`,
      metadata: { payment_method, paid_at, invoice_number: updated.invoice_number },
      req,
    })

    return NextResponse.json({ invoice: updated })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal memverifikasi pembayaran"
    return NextResponse.json({ error: "Bad Request", message }, { status: 400 })
  }
}
