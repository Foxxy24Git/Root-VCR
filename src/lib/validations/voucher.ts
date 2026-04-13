import { z } from "zod"

// Zod v4 pakai UUID RFC 4122 ketat — gunakan regex sendiri agar
// support semua format UUID yang valid di PostgreSQL
const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "ID tidak valid (format UUID diperlukan)"
  )

export const generateVoucherSchema = z.object({
  profileId: uuidSchema,
  quantity: z.number().int().min(1, "Minimal 1 voucher").max(100, "Maksimal 100 voucher per generate"),
})

export type GenerateVoucherInput = z.infer<typeof generateVoucherSchema>
