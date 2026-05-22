import { z } from "zod"

const slugRegex = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/

const mikrotikConfigSchema = z.object({
  mikrotik_host: z.string().min(1, "MikroTik host wajib").max(255),
  mikrotik_port: z.number().int().min(1).max(65535).default(8728),
  mikrotik_username: z.string().min(1, "MikroTik username wajib").max(100),
  mikrotik_password: z.string().min(1, "MikroTik password wajib"),
  mikrotik_use_ssl: z.boolean().default(false),
})

export const createTenantSchema = z.object({
  // Tenant identity
  name: z.string().min(2, "Nama tenant minimal 2 karakter").max(150),
  slug: z
    .string()
    .toLowerCase()
    .min(3, "Slug minimal 3 karakter")
    .max(100)
    .regex(slugRegex, "Slug hanya boleh huruf kecil, angka, dan tanda hubung"),
  owner_name: z.string().min(2).max(150),
  owner_email: z.string().email("Email owner tidak valid"),
  owner_phone: z.string().min(6).max(30),

  // MikroTik config (password akan di-encrypt)
  ...mikrotikConfigSchema.shape,

  // Initial Tenant Admin user
  admin_email: z.string().email("Email admin tidak valid"),
  admin_password: z.string().min(6, "Password admin minimal 6 karakter"),
  admin_name: z.string().min(2, "Nama admin minimal 2 karakter").max(100),

  // Plan (optional — default: Trial)
  plan_id: z.string().uuid().optional(),

  // Optional overrides (jika tidak diisi, pakai default dari plan)
  max_resellers: z.number().int().positive().optional(),
  max_vouchers_per_month: z.number().int().positive().optional(),

  // Branding (opsional)
  logo_url: z.string().url().max(500).optional(),
  brand_color: z.string().max(20).optional(),
})

export const updateTenantSchema = z
  .object({
    name: z.string().min(2).max(150).optional(),
    owner_name: z.string().min(2).max(150).optional(),
    owner_email: z.string().email().optional(),
    owner_phone: z.string().min(6).max(30).optional(),

    // MikroTik config — password optional (hanya update jika diisi)
    mikrotik_host: z.string().min(1).max(255).optional(),
    mikrotik_port: z.number().int().min(1).max(65535).optional(),
    mikrotik_username: z.string().min(1).max(100).optional(),
    mikrotik_password: z.string().min(1).optional(),
    mikrotik_use_ssl: z.boolean().optional(),

    max_resellers: z.number().int().positive().optional(),
    max_vouchers_per_month: z.number().int().positive().optional(),

    logo_url: z.string().url().max(500).nullable().optional(),
    brand_color: z.string().max(20).nullable().optional(),
  })
  .strict()

export const suspendTenantSchema = z.object({
  reason: z.string().min(3, "Alasan suspend minimal 3 karakter").max(500),
})

export const extendTrialSchema = z.object({
  additional_days: z
    .number()
    .int()
    .positive("Hari tambahan harus > 0")
    .max(365, "Maksimal 365 hari"),
})

export const convertFromTrialSchema = z.object({
  plan_id: z.string().uuid("plan_id tidak valid"),
})

export const testMikrotikInlineSchema = mikrotikConfigSchema

export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>
export type SuspendTenantInput = z.infer<typeof suspendTenantSchema>
export type ExtendTrialInput = z.infer<typeof extendTrialSchema>
export type ConvertFromTrialInput = z.infer<typeof convertFromTrialSchema>
