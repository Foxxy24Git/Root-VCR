import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { computeVoucherStatuses, HotspotUser } from "@/services/mikrotik.service"
import { withMikrotik } from "@/lib/mikrotik"

// POST /api/mikrotik/sync-vouchers
// Admin: sync all non-deleted vouchers + delete from DB if gone from MikroTik
// Reseller: sync only their own vouchers
export async function POST() {
  const { user, error } = await requireAuth()
  if (error) return error

  const where =
    user.role === "reseller"
      ? { user_id: user.id, status: { not: "deleted" as const } }
      : { status: { not: "deleted" as const } }

  let vouchers = await prisma.voucher.findMany({
    where,
    select: { id: true, code: true, used_at: true, status: true, client_ip: true, client_mac: true },
  })

  // ── Bidirectional delete sync (admin only) ──────────────────────────────
  // Delete from DB any voucher that no longer exists in MikroTik.
  // Guard: skip entirely if MT returns an empty user list to prevent mass deletion.
  if (user.role === "admin" && vouchers.length > 0) {
    try {
      const mtUsers = await withMikrotik((api) =>
        api.menu("/ip/hotspot/user").getAll() as Promise<HotspotUser[]>
      )

      console.log("[sync-vouchers] MT user count:", mtUsers.length, "DB voucher count:", vouchers.length)
      mtUsers.forEach((u) => console.log("[sync-vouchers] FROM MT:", u.name, "(type:", typeof u.name, ")"))

      // Guard: if MikroTik returned 0 users, skip deletion — avoids wiping DB
      // on connection lag or partial response.
      if (mtUsers.length === 0) {
        console.warn("[sync-vouchers] MT returned 0 users — skipping bidirectional delete to avoid false wipe")
      } else {
        // Always stringify names to avoid type-mismatch with numeric usernames
        // (routeros-client may return numbers for numeric-only names at runtime)
        const mtSet = new Set(
          mtUsers.map((u) => String(u.name ?? "")).filter(Boolean)
        )

        const toDelete = vouchers.filter((v) => !mtSet.has(String(v.code)))
        if (toDelete.length > 0) {
          console.log("[sync-vouchers] Deleting from DB (not in MT):", toDelete.map((v) => v.code))
          await prisma.voucher.deleteMany({
            where: { id: { in: toDelete.map((v) => v.id) } },
          })
          // Remove deleted vouchers from the list before status sync
          const deletedIds = new Set(toDelete.map((v) => v.id))
          vouchers = vouchers.filter((v) => !deletedIds.has(v.id))
        }
      }
    } catch (e) {
      console.error("[sync-vouchers] MT delete-check error:", e)
      // Non-fatal: continue with status sync
    }
  }

  if (vouchers.length === 0) {
    return NextResponse.json({ synced: 0, total: 0, message: "Tidak ada voucher untuk disinkronkan" })
  }

  let syncResults
  try {
    syncResults = await computeVoucherStatuses(vouchers.map((v) => ({ code: v.code })))
  } catch (e) {
    console.error("[sync-vouchers] MikroTik error:", e)
    return NextResponse.json({ error: "Gagal terhubung ke MikroTik" }, { status: 503 })
  }

  const resultMap = new Map(syncResults.map((r) => [r.code, r]))
  const now = new Date()

  // Only update vouchers whose status or client_ip actually changed
  const toUpdate = vouchers.filter((v) => {
    const r = resultMap.get(v.code)
    if (!r) return false
    return r.status !== v.status || (r.status === "active" && r.client_ip !== v.client_ip)
  })

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map((v) => {
        const r = resultMap.get(v.code)!
        return prisma.voucher.update({
          where: { id: v.id },
          data: {
            status: r.status,
            // When active: save IP/MAC and set used_at if first use
            ...(r.status === "active"
              ? {
                  client_ip: r.client_ip,
                  ...(r.client_mac ? { client_mac: r.client_mac } : {}),
                  ...(!v.used_at ? { used_at: now } : {}),
                }
              : {}),
            // When inactive/expired: preserve existing client_ip (last known), no overwrites
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
