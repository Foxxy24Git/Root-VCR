import { z } from "zod"

export const createBankAccountSchema = z.object({
  bank_name: z.string().min(2, "Nama bank minimal 2 karakter").max(100),
  account_number: z
    .string()
    .min(3, "Nomor rekening minimal 3 digit/karakter")
    .max(50),
  account_holder: z.string().min(2, "Nama pemilik minimal 2 karakter").max(150),
  notes: z.string().max(500).nullable().optional(),
  is_active: z.boolean().default(true),
  display_order: z.number().int().min(0).default(0),
})

export const updateBankAccountSchema = z
  .object({
    bank_name: z.string().min(2).max(100).optional(),
    account_number: z.string().min(3).max(50).optional(),
    account_holder: z.string().min(2).max(150).optional(),
    notes: z.string().max(500).nullable().optional(),
    is_active: z.boolean().optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .strict()

export const reorderBankAccountsSchema = z.object({
  order: z
    .array(z.string().uuid("ID bank account tidak valid"))
    .min(1, "List ID tidak boleh kosong"),
})

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>
export type ReorderBankAccountsInput = z.infer<typeof reorderBankAccountsSchema>
