import { auth } from "@/lib/auth"
import type { Role } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────
// Error classes — caller bertanggung jawab map ke NextResponse 401/403
// ─────────────────────────────────────────────────────────────────────

export class UnauthorizedError extends Error {
  readonly status = 401 as const
  constructor(message = "Session diperlukan") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends Error {
  readonly status = 403 as const
  constructor(message = "Akses ditolak") {
    super(message)
    this.name = "ForbiddenError"
  }
}

// ─────────────────────────────────────────────────────────────────────
// Tenant context
// ─────────────────────────────────────────────────────────────────────

export interface TenantContext {
  userId: string
  role: Role
  /** null hanya untuk SUPER_ADMIN; selain itu pasti string. */
  tenantId: string | null
  tenantSlug: string | null
}

/** Context untuk role yang wajib punya tenantId (non-super-admin). */
export interface ScopedTenantContext extends TenantContext {
  tenantId: string
  tenantSlug: string
}

/**
 * Resolve auth & tenant context dari session aktif.
 *
 * - SUPER_ADMIN: tenantId boleh null (cross-tenant access).
 * - TENANT_ADMIN / RESELLER: WAJIB punya tenantId. Jika tidak → ForbiddenError
 *   (sesuai PRD §7.1).
 *
 * @throws {UnauthorizedError} jika tidak ada session.
 * @throws {ForbiddenError}    jika non-super-admin tanpa tenantId.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await auth()
  if (!session?.user) throw new UnauthorizedError()

  const { id, role, tenantId, tenantSlug } = session.user

  if (role !== "SUPER_ADMIN" && !tenantId) {
    throw new ForbiddenError("User tidak terikat ke tenant manapun")
  }

  return {
    userId: id,
    role,
    tenantId: tenantId ?? null,
    tenantSlug: tenantSlug ?? null,
  }
}

/** Wajib SUPER_ADMIN. */
export async function requireSuperAdmin(): Promise<TenantContext> {
  const ctx = await getTenantContext()
  if (ctx.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Hanya Super Admin yang bisa mengakses")
  }
  return ctx
}

/** Wajib TENANT_ADMIN dengan tenantId terikat. */
export async function requireTenantAdmin(): Promise<ScopedTenantContext> {
  const ctx = await getTenantContext()
  if (ctx.role !== "TENANT_ADMIN") {
    throw new ForbiddenError("Hanya Tenant Admin yang bisa mengakses")
  }
  if (!ctx.tenantId || !ctx.tenantSlug) {
    throw new ForbiddenError("Tenant context wajib untuk Tenant Admin")
  }
  return { ...ctx, tenantId: ctx.tenantId, tenantSlug: ctx.tenantSlug }
}

/** Wajib RESELLER dengan tenantId terikat. */
export async function requireReseller(): Promise<ScopedTenantContext> {
  const ctx = await getTenantContext()
  if (ctx.role !== "RESELLER") {
    throw new ForbiddenError("Hanya Reseller yang bisa mengakses")
  }
  if (!ctx.tenantId || !ctx.tenantSlug) {
    throw new ForbiddenError("Tenant context wajib untuk Reseller")
  }
  return { ...ctx, tenantId: ctx.tenantId, tenantSlug: ctx.tenantSlug }
}

/** Wajib login (role apapun). Berguna untuk endpoint shared. */
export async function requireAnyRole(): Promise<TenantContext> {
  return getTenantContext()
}
