import { z } from "zod"

export const createUserSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  phone: z.string().optional(),
  location: z.string().optional(),
  fee_percentage: z.number().min(0).max(100).default(0),
})

export const updateUserSchema = createUserSchema.partial().omit({ password: true })

export const walletTopupSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive("Jumlah harus lebih dari 0"),
  description: z.string().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type WalletTopupInput = z.infer<typeof walletTopupSchema>
