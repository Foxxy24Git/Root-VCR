import { z } from "zod"

/**
 * Daftar feature flag yang bisa dipilih saat membuat/edit plan.
 * Ditampilkan sebagai multi-select di form UI.
 */
export const PLAN_FEATURES = [
  { key: "whatsapp_notif", label: "Notifikasi WhatsApp" },
  { key: "branding", label: "Custom Branding (logo & warna)" },
  { key: "priority_support", label: "Priority Support" },
  { key: "custom_domain", label: "Custom Domain" },
  { key: "api_access", label: "API Access" },
  { key: "advanced_reports", label: "Laporan Lanjutan" },
] as const

export type PlanFeatureKey = (typeof PLAN_FEATURES)[number]["key"]

const featureKeys = PLAN_FEATURES.map((f) => f.key) as [
  PlanFeatureKey,
  ...PlanFeatureKey[],
]

export const createPlanSchema = z.object({
  name: z.string().min(2, "Nama plan minimal 2 karakter").max(100),
  description: z.string().max(500).nullable().optional(),
  price: z.number().min(0, "Harga tidak boleh negatif"),
  duration_days: z
    .number()
    .int()
    .positive("Durasi harus > 0 hari")
    .max(3650, "Maksimal 10 tahun"),
  is_trial: z.boolean().default(false),
  max_resellers: z.number().int().min(0, "Max reseller tidak boleh negatif"),
  max_vouchers_per_month: z
    .number()
    .int()
    .min(0, "Max voucher tidak boleh negatif"),
  features: z.array(z.enum(featureKeys)).default([]),
  is_active: z.boolean().default(true),
})

export const updatePlanSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    price: z.number().min(0).optional(),
    duration_days: z.number().int().positive().max(3650).optional(),
    is_trial: z.boolean().optional(),
    max_resellers: z.number().int().min(0).optional(),
    max_vouchers_per_month: z.number().int().min(0).optional(),
    features: z.array(z.enum(featureKeys)).optional(),
    is_active: z.boolean().optional(),
  })
  .strict()

export type CreatePlanInput = z.infer<typeof createPlanSchema>
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>
