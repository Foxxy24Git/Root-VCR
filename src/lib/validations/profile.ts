import { z } from "zod"

export const createProfileSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100),
  duration_days: z.number().int().min(0),
  duration_hours: z.number().int().min(0).default(0),
  price: z.number().positive("Harga harus lebih dari 0"),
  speed_limit: z.string().max(50).optional(),
  mikrotik_profile: z.string().min(1, "MikroTik profile wajib diisi").max(100),
  is_active: z.boolean().default(true),
})

export const updateProfileSchema = createProfileSchema.partial()

export type CreateProfileInput = z.infer<typeof createProfileSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
