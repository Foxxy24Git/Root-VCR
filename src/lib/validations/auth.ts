import { z } from "zod"

// Legacy single-tenant login — dipertahankan sementara untuk backward compat.
// Akan dihapus setelah login form di-refactor ke multi-tenant.
export const loginSchema = z.object({
  email: z.string().toLowerCase().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

// Tenant login (TENANT_ADMIN / RESELLER): butuh kode tenant + email + password.
export const tenantLoginSchema = z.object({
  tenantCode: z
    .string()
    .min(1, "Kode tenant wajib diisi")
    .max(100, "Kode tenant terlalu panjang")
    .regex(/^[a-z0-9-]+$/i, "Kode tenant hanya boleh huruf, angka, dan tanda hubung"),
  email: z.string().toLowerCase().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

// Super Admin login: email + password saja (tanpa tenantCode).
export const superAdminLoginSchema = z.object({
  email: z.string().toLowerCase().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirmPassword"],
})

export type LoginInput = z.infer<typeof loginSchema>
export type TenantLoginInput = z.infer<typeof tenantLoginSchema>
export type SuperAdminLoginInput = z.infer<typeof superAdminLoginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
