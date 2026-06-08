import { prisma } from "@/lib/prisma"
import { Prisma, PrismaClient } from "@prisma/client"

/**
 * Models yang punya kolom `tenant_id` (per schema 2026-05-22).
 *
 * Key di-lowercase agar match dengan `model` string yang dikirim Prisma extension
 * (Prisma capitalizes model names; kita normalize sebelum lookup).
 *
 * CATATAN:
 * - Tabel global (Tenant, Plan, BankAccount) TIDAK di-scope — hanya Super Admin
 *   yang query langsung pakai `prisma`, bukan via tenant-scoped client.
 * - User & AuditLog NULLABLE tenant_id; auto-inject tetap aman karena yang
 *   memakai tenant-scoped client hanya pada konteks tenant tertentu.
 */
const TENANT_SCOPED_MODELS = new Set([
  "user",
  "profile",
  "voucher",
  "wallet",
  "walletlog",
  "resellerprofile",
  "setting",
  "pppoeuser",
  "auditlog",
  "subscriptioninvoice",
])

function isTenantScoped(model: string | undefined): boolean {
  if (!model) return false
  return TENANT_SCOPED_MODELS.has(model.toLowerCase())
}

/**
 * Kembalikan Prisma client yang auto-inject `tenant_id` filter untuk semua
 * model yang memiliki kolom tersebut.
 *
 * Pemakaian:
 * ```ts
 *   const db = getTenantPrisma(ctx.tenantId)
 *   const vouchers = await db.voucher.findMany()           // scoped
 *   await db.voucher.create({ data: { code: "X", ... } })  // tenant_id auto-injected
 * ```
 *
 * Behaviors:
 * - READ (find*, count, aggregate, groupBy)              → inject `where.tenant_id`
 * - WRITE-MANY (updateMany, deleteMany)                  → inject `where.tenant_id`
 * - WRITE-UNIQUE (update, delete, findUnique[OrThrow])   → inject `where.tenant_id`
 *   (Prisma 5+ menerima non-unique fields di WhereUniqueInput sebagai filter tambahan)
 * - CREATE (create, createMany, upsert)                  → inject `data.tenant_id`
 *
 * Untuk model GLOBAL (Tenant, Plan, BankAccount) gunakan `prisma` langsung —
 * extension ini hanya intercept model yang ada di whitelist `TENANT_SCOPED_MODELS`.
 */
export function getTenantPrisma(tenantId: string, client: PrismaClient = prisma) {
  if (!tenantId) {
    throw new Error("getTenantPrisma: tenantId wajib diisi")
  }

  return client.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!isTenantScoped(model)) return query(args)

          // Operations yang punya `where` — inject filter tenant_id
          if (
            operation === "findFirst" ||
            operation === "findFirstOrThrow" ||
            operation === "findMany" ||
            operation === "findUnique" ||
            operation === "findUniqueOrThrow" ||
            operation === "count" ||
            operation === "aggregate" ||
            operation === "groupBy" ||
            operation === "update" ||
            operation === "updateMany" ||
            operation === "delete" ||
            operation === "deleteMany"
          ) {
            const a = args as { where?: Record<string, unknown> }
            a.where = { ...(a.where ?? {}), tenant_id: tenantId }
            return query(args)
          }

          // CREATE — inject ke data
          if (operation === "create") {
            const a = args as { data?: Record<string, unknown> }
            a.data = { ...(a.data ?? {}), tenant_id: tenantId }
            return query(args)
          }

          if (operation === "createMany") {
            const a = args as {
              data?: Record<string, unknown> | Record<string, unknown>[]
            }
            const data = a.data
            if (Array.isArray(data)) {
              a.data = data.map((d) => ({ ...d, tenant_id: tenantId }))
            } else if (data) {
              a.data = { ...data, tenant_id: tenantId }
            }
            return query(args)
          }

          if (operation === "upsert") {
            const a = args as {
              where?: Record<string, unknown>
              create?: Record<string, unknown>
              update?: Record<string, unknown>
            }
            a.where = { ...(a.where ?? {}), tenant_id: tenantId }
            if (a.create) a.create = { ...a.create, tenant_id: tenantId }
            return query(args)
          }

          return query(args)
        },
      },
    },
  })
}

export type TenantPrismaClient = ReturnType<typeof getTenantPrisma>

// Re-export Prisma namespace agar caller bisa pakai tipe (Prisma.VoucherWhereInput dll)
// tanpa import dari @prisma/client secara terpisah.
export { Prisma }
