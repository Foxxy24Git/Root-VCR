import { z } from "zod"

export const createInvoiceSchema = z
  .object({
    tenant_id: z.string().uuid("tenant_id harus UUID"),
    plan_id: z.string().uuid("plan_id harus UUID"),
    period_start: z.string().datetime("period_start harus ISO datetime"),
    period_end: z.string().datetime("period_end harus ISO datetime"),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine(
    (d) => new Date(d.period_end) > new Date(d.period_start),
    { message: "period_end harus setelah period_start", path: ["period_end"] },
  )

export const verifyPaymentSchema = z
  .object({
    payment_method: z.string().min(2, "Metode pembayaran minimal 2 karakter").max(100),
    paid_at: z.string().datetime("paid_at harus ISO datetime"),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine(
    (d) => new Date(d.paid_at) <= new Date(),
    { message: "Tanggal bayar tidak boleh di masa depan", path: ["paid_at"] },
  )

export const rejectPaymentSchema = z.object({
  reason: z.string().min(5, "Alasan penolakan minimal 5 karakter").max(500),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>
