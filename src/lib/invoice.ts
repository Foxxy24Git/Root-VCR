import { prisma } from "@/lib/prisma"

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export interface GenerateInvoiceParams {
  tenantId: string
  tenantSlug: string
  planPrice: number | string
  periodStart: Date
  periodEnd: Date
  notes?: string | null
  now?: Date
}

export interface VerifyPaymentParams {
  invoiceId: string
  verifiedBy: string
  paymentMethod: string
  paidAt: Date
  notes?: string | null
}

export interface RejectPaymentParams {
  invoiceId: string
  reason: string
}

// ─────────────────────────────────────────────────────────────────────
// Invoice number: INV-{YYYYMMDD}-{slug}-{seq padded to 3}
// seq = total invoices for this tenant so far + 1
// ─────────────────────────────────────────────────────────────────────

export function buildInvoiceNumber(
  tenantSlug: string,
  seq: number,
  date?: Date,
): string {
  const d = date ?? new Date()
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const seqStr = String(seq).padStart(3, "0")
  return `INV-${yyyy}${mm}${dd}-${tenantSlug}-${seqStr}`
}

// ─────────────────────────────────────────────────────────────────────
// generateInvoice — buat invoice PENDING baru
// ─────────────────────────────────────────────────────────────────────

export async function generateInvoice(params: GenerateInvoiceParams) {
  const { tenantId, tenantSlug, planPrice, periodStart, periodEnd, notes, now } = params

  const existingCount = await prisma.subscriptionInvoice.count({
    where: { tenant_id: tenantId },
  })
  const seq = existingCount + 1
  const invoiceNumber = buildInvoiceNumber(tenantSlug, seq, now)

  const invoice = await prisma.subscriptionInvoice.create({
    data: {
      tenant_id: tenantId,
      invoice_number: invoiceNumber,
      amount: Number(planPrice),
      period_start: periodStart,
      period_end: periodEnd,
      status: "PENDING",
      notes: notes ?? null,
    },
  })

  return invoice
}

// ─────────────────────────────────────────────────────────────────────
// verifyPayment — set PAID + extend subscription
// ─────────────────────────────────────────────────────────────────────

export async function verifyPayment(params: VerifyPaymentParams) {
  const { invoiceId, verifiedBy, paymentMethod, paidAt, notes } = params

  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
  })

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan")
  }

  if (invoice.status !== "AWAITING_VERIFICATION") {
    throw new Error(`Invoice status tidak valid untuk verifikasi: ${invoice.status}`)
  }

  const now = new Date()

  const [updated] = await Promise.all([
    prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paid_at: paidAt,
        payment_method: paymentMethod,
        verified_by: verifiedBy,
        verified_at: now,
        notes: notes ?? invoice.notes,
        rejected_reason: null,
      },
    }),
    prisma.tenant.update({
      where: { id: invoice.tenant_id },
      data: {
        is_active: true,
        is_trial: false,
        suspended_reason: null,
        subscription_start_at: invoice.period_start,
        subscription_end_at: invoice.period_end,
      },
    }),
  ])

  return updated
}

// ─────────────────────────────────────────────────────────────────────
// rejectPayment — reset ke PENDING + simpan alasan
// ─────────────────────────────────────────────────────────────────────

export async function rejectPayment(params: RejectPaymentParams) {
  const { invoiceId, reason } = params

  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
  })

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan")
  }

  if (invoice.status !== "AWAITING_VERIFICATION") {
    throw new Error(`Invoice status tidak valid untuk penolakan: ${invoice.status}`)
  }

  return prisma.subscriptionInvoice.update({
    where: { id: invoiceId },
    data: {
      status: "PENDING",
      rejected_reason: reason,
      payment_proof: null,
      payment_notes: null,
    },
  })
}
