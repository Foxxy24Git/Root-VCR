import type { Prisma } from "@prisma/client"

/**
 * Field selection for tenant detail responses.
 *
 * SECURITY: this select deliberately enumerates fields and OMITS
 * `mikrotik_password_enc`. The encrypted MikroTik password must never leave the
 * server in an API response. Asserted in `src/tests/lib/tenant-select.test.ts`.
 */
export const TENANT_DETAIL_SELECT = {
  id: true,
  name: true,
  slug: true,
  owner_name: true,
  owner_email: true,
  owner_phone: true,
  mikrotik_host: true,
  mikrotik_port: true,
  mikrotik_username: true,
  mikrotik_use_ssl: true,
  mikrotik_last_test_at: true,
  mikrotik_last_test_ok: true,
  mikrotik_last_edited_by: true,
  mikrotik_last_edited_at: true,
  is_trial: true,
  trial_end_at: true,
  subscription_start_at: true,
  subscription_end_at: true,
  is_active: true,
  suspended_reason: true,
  max_resellers: true,
  max_vouchers_per_month: true,
  logo_url: true,
  brand_color: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  plan: {
    select: {
      id: true,
      name: true,
      price: true,
      duration_days: true,
      is_trial: true,
    },
  },
  _count: { select: { users: true, vouchers: true, profiles: true, invoices: true } },
} satisfies Prisma.TenantSelect
