// Role enum re-exported from Prisma agar tipe konsisten antara DB & app.
// Values: SUPER_ADMIN | TENANT_ADMIN | RESELLER (per schema 2026-05-22).
import type { Role } from "@prisma/client"
export type { Role }

export type VoucherStatus = "unused" | "active" | "inactive" | "expired" | "deleted"

export type WalletLogType = "topup" | "deduct" | "generate" | "refund" | "adjustment"

export interface User {
  id: string
  email: string
  name: string
  role: Role
  phone?: string | null
  location?: string | null
  avatar_url?: string | null
  is_active: boolean
  is_frozen: boolean
  fee_percentage: number
  created_at: Date
  updated_at: Date
}

export interface Profile {
  id: string
  name: string
  duration_days: number
  duration_hours: number
  price: number
  speed_limit?: string | null
  mikrotik_profile: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Voucher {
  id: string
  code: string
  user_id?: string | null
  profile_id?: string | null
  status: VoucherStatus
  price_charged: number
  generated_at: Date
  used_at?: Date | null
  expired_at?: Date | null
  client_ip?: string | null
  client_mac?: string | null
  mikrotik_synced: boolean
  created_at: Date
}

export interface Wallet {
  id: string
  user_id: string
  balance: number
  total_topup: number
  total_spent: number
  updated_at: Date
}

export interface WalletLog {
  id: string
  wallet_id: string
  type: WalletLogType
  amount: number
  balance_before: number
  balance_after: number
  description?: string | null
  reference_id?: string | null
  admin_id?: string | null
  created_at: Date
}
