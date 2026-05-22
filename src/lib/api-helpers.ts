import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { Role } from "@prisma/client"
import {
  getTenantContext as _getTenantContext,
  ForbiddenError,
  UnauthorizedError,
  type TenantContext,
} from "@/lib/tenant-context"
import { getTenantPrisma, type TenantPrismaClient } from "@/lib/prisma-tenant"

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  tenantId: string | null
  tenantSlug: string | null
}

type Result =
  | { user: SessionUser; error: null }
  | { user: null; error: NextResponse }

function forbid(message: string): NextResponse {
  return NextResponse.json(
    { error: "Forbidden", message },
    { status: 403 }
  )
}

/** Ambil session user, return null jika tidak ada. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user) return null
  return session.user as SessionUser
}

/** Require auth (role apapun). */
export async function requireAuth(): Promise<Result> {
  const user = await getSessionUser()
  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Unauthorized", message: "Login diperlukan" },
        { status: 401 }
      ),
    }
  }
  return { user, error: null }
}

/** Require SUPER_ADMIN role. */
export async function requireSuperAdmin(): Promise<Result> {
  const result = await requireAuth()
  if (result.error) return result
  if (result.user.role !== "SUPER_ADMIN") {
    return { user: null, error: forbid("Hanya Super Admin yang bisa mengakses") }
  }
  return result
}

/** Require TENANT_ADMIN role + tenantId terikat. */
export async function requireTenantAdmin(): Promise<Result> {
  const result = await requireAuth()
  if (result.error) return result
  if (result.user.role !== "TENANT_ADMIN") {
    return { user: null, error: forbid("Hanya Tenant Admin yang bisa mengakses") }
  }
  if (!result.user.tenantId) {
    return { user: null, error: forbid("Tenant context wajib untuk Tenant Admin") }
  }
  return result
}

/** Require RESELLER role + tenantId terikat. */
export async function requireReseller(): Promise<Result> {
  const result = await requireAuth()
  if (result.error) return result
  if (result.user.role !== "RESELLER") {
    return { user: null, error: forbid("Hanya Reseller yang bisa mengakses") }
  }
  if (!result.user.tenantId) {
    return { user: null, error: forbid("Tenant context wajib untuk Reseller") }
  }
  return result
}

/**
 * Require TENANT_ADMIN ATAU SUPER_ADMIN.
 * Endpoint admin-area umum di mana super admin bisa override (untuk debugging /
 * support customer).
 */
export async function requireAdminOrSuperAdmin(): Promise<Result> {
  const result = await requireAuth()
  if (result.error) return result
  const r = result.user.role
  if (r !== "TENANT_ADMIN" && r !== "SUPER_ADMIN") {
    return { user: null, error: forbid("Hanya admin yang bisa mengakses") }
  }
  if (r === "TENANT_ADMIN" && !result.user.tenantId) {
    return { user: null, error: forbid("Tenant context wajib") }
  }
  return result
}

/**
 * Backward-compat alias untuk legacy single-tenant kode.
 * Sebelum migrasi multi-tenant, "admin" = pemilik aplikasi tunggal.
 * Sekarang ekuivalennya adalah TENANT_ADMIN (admin per-tenant).
 * @deprecated Pakai `requireTenantAdmin()` di kode baru.
 */
export const requireAdmin = requireTenantAdmin

/**
 * Buat paginated response (clamp limit ke 1-100, page ke ≥1).
 */
export function paginate(page: number, limit: number) {
  const take = Math.min(Math.max(limit, 1), 100)
  const skip = (Math.max(page, 1) - 1) * take
  return { take, skip }
}

/**
 * Helper: pastikan tenantId tersedia. Untuk endpoint tenant-scoped, super admin
 * boleh override via query param ?tenantId=xxx (PRD §7.1).
 *
 * @throws NextResponse 403 jika tenant context tidak bisa di-resolve.
 */
export function resolveTenantId(
  user: SessionUser,
  overrideTenantId?: string | null
): { tenantId: string; error: null } | { tenantId: null; error: NextResponse } {
  if (user.role === "SUPER_ADMIN") {
    const tid = overrideTenantId ?? user.tenantId
    if (!tid) {
      return {
        tenantId: null,
        error: forbid("Super Admin harus pilih tenant (?tenantId=...)"),
      }
    }
    return { tenantId: tid, error: null }
  }
  if (!user.tenantId) {
    return { tenantId: null, error: forbid("Tenant context wajib") }
  }
  return { tenantId: user.tenantId, error: null }
}

// ─────────────────────────────────────────────────────────────────────
// Tenant scope helper — combine getTenantContext + getTenantPrisma
// ─────────────────────────────────────────────────────────────────────

export interface ScopedTenant {
  ctx: TenantContext & { tenantId: string }
  db: TenantPrismaClient
}

type TenantScopeResult =
  | { ctx: ScopedTenant["ctx"]; db: ScopedTenant["db"]; error: null }
  | { ctx: null; db: null; error: NextResponse }

/**
 * Resolve session ke tenant-scoped context + Prisma client dalam satu pemanggilan.
 *
 * - SUPER_ADMIN wajib pilih tenant via param `overrideTenantId` (biasanya dari
 *   `?tenantId=` query param di route).
 * - TENANT_ADMIN / RESELLER: pakai `tenantId` dari session.
 * - `db` adalah `getTenantPrisma(tenantId)` yang auto-inject `tenant_id` ke
 *   semua query untuk model yang ber-tenant.
 *
 * Pemakaian di route:
 * ```ts
 *   const { ctx, db, error } = await getTenantScope(req.nextUrl.searchParams.get("tenantId"))
 *   if (error) return error
 *   const vouchers = await db.voucher.findMany()  // auto-scoped tenant_id
 * ```
 */
export async function getTenantScope(
  overrideTenantId?: string | null
): Promise<TenantScopeResult> {
  let ctx: TenantContext
  try {
    ctx = await _getTenantContext()
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return {
        ctx: null,
        db: null,
        error: NextResponse.json(
          { error: "Unauthorized", message: e.message },
          { status: 401 }
        ),
      }
    }
    if (e instanceof ForbiddenError) {
      return { ctx: null, db: null, error: forbid(e.message) }
    }
    throw e
  }

  let tenantId: string | null
  if (ctx.role === "SUPER_ADMIN") {
    tenantId = overrideTenantId ?? ctx.tenantId
    if (!tenantId) {
      return {
        ctx: null,
        db: null,
        error: forbid("Super Admin harus pilih tenant (?tenantId=...)"),
      }
    }
  } else {
    if (!ctx.tenantId) {
      return { ctx: null, db: null, error: forbid("Tenant context wajib") }
    }
    tenantId = ctx.tenantId
  }

  return {
    ctx: { ...ctx, tenantId },
    db: getTenantPrisma(tenantId),
    error: null,
  }
}

// Re-export for convenience (PRD says: import getTenantContext from @/lib/tenant-context)
export { _getTenantContext as getTenantContext }
export type { TenantContext } from "@/lib/tenant-context"
