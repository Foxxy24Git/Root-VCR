import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { computeVoucherStatuses, HotspotUser } from "@/services/mikrotik.service"
import { withMikrotik } from "@/lib/mikrotik"

// POST /api/mikrotik/sync-vouchers
// Tenant Admin: sync all non-deleted vouchers in their tenant + delete from DB if gone from MikroTik
// Reseller: sync only their own vouchers
export async function POST(req: NextRequest) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  const where = {
    status: { not: "deleted" as const },
    ...(ctx.role === "RESELLER" ? { user_id: ctx.userId } : {}),
  }

  let vouchers = await db.voucher.findMany({
    where,
    select: { id: true, code: true, used_at: true, status: true, client_ip: true, client_mac: true },
  })

  // ── Bidirectional delete sync (tenant admin only) ──────────────────────
  if (ctx.role === "TENANT_ADMIN" && vouchers.length > 0) {
    try {
      const mtUsers = await withMikrotik(ctx.tenantId, (api) =>
        api.menu("/ip/hotspot/user").getAll() as Promise<HotspotUser[]>
      )

      console.log("[sync-vouchers] MT user count:", mtUsers.length, "DB voucher count:", vouchers.length)
      mtUsers.forEach((u) => console.log("[sync-vouchers] FROM MT:", u.name, "(type:", typeof u.name, ")"))

      if (mtUsers.length === 0) {
        console.warn("[sync-vouchers] MT returned 0 users — skipping bidirectional delete to avoid false wipe")
      } else {
        const mtSet = new Set(
          mtUsers.map((u) => String(u.name ?? "")).filter(Boolean)
        )

        const toDelete = vouchers.filter((v) => !mtSet.has(String(v.code)))
        if (toDelete.length > 0) {
          console.log("[sync-vouchers] Deleting from DB (not in MT):", toDelete.map((v) => v.code))
          await db.voucher.deleteMany({
            where: { id: { in: toDelete.map((v) => v.id) } },
          })
          const deletedIds = new Set(toDelete.map((v) => v.id))
          vouchers = vouchers.filter((v) => !deletedIds.has(v.id))
        }
      }
    } catch (e) {
      console.error("[sync-vouchers] MT delete-check error:", e)
    }
  }

  if (vouchers.length === 0) {
    return NextResponse.json({ synced: 0, total: 0, message: "Tidak ada voucher untuk disinkronkan" })
  }

  let syncResults
  try {
    syncResults = await computeVoucherStatuses(ctx.tenantId, vouchers.map((v) => ({ code: v.code })))
  } catch (e) {
    console.error("[sync-vouchers] MikroTik error:", e)
    return NextResponse.json({ error: "Gagal terhubung ke MikroTik" }, { status: 503 })
  }

  const resultMap = new Map(syncResults.map((r) => [r.code, r]))
  const now = new Date()

  const toUpdate = vouchers.filter((v) => {
    const r = resultMap.get(v.code)
    if (!r) return false
    return r.status !== v.status || (r.status === "active" && r.client_ip !== v.client_ip)
  })

  if (toUpdate.length > 0) {
    await db.$transaction(
      toUpdate.map((v) => {
        const r = resultMap.get(v.code)!
        return db.voucher.update({
          where: { id: v.id },
          data: {
            status: r.status,
            ...(r.status === "active"
              ? {
                  client_ip: r.client_ip,
                  ...(r.client_mac ? { client_mac: r.client_mac } : {}),
                  ...(!v.used_at ? { used_at: now } : {}),
                }
              : {}),
          },
        })
      })
    )
  }

  return NextResponse.json({
    synced: toUpdate.length,
    total: vouchers.length,
    message: `${toUpdate.length} voucher diperbarui dari ${vouchers.length} total`,
  })
}
