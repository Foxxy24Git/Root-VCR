import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export interface AuditLogInput {
  action: string                       // "tenant.created", "tenant.suspended", dll
  userId?: string | null               // Super Admin / Tenant Admin yang melakukan
  tenantId?: string | null             // tenant target (null untuk operasi global)
  resource?: string | null             // "tenant:<id>", "voucher:<id>"
  metadata?: Record<string, unknown> | null
  req?: NextRequest | Request | null   // untuk extract IP & user-agent
}

function extractIp(req: NextRequest | Request | null | undefined): string | null {
  if (!req) return null
  const headers = req.headers
  const fwd = headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    null
  )
}

/**
 * Tulis audit log. Best-effort: jika gagal, hanya di-log ke console — TIDAK
 * boleh menggagalkan operasi bisnis utama.
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        user_id: input.userId ?? null,
        tenant_id: input.tenantId ?? null,
        resource: input.resource ?? null,
        metadata: (input.metadata ?? null) as never,
        ip_address: extractIp(input.req),
        user_agent: input.req?.headers.get("user-agent")?.slice(0, 500) ?? null,
      },
    })
  } catch (err) {
    console.error("[audit] writeAuditLog failed:", err)
  }
}
