import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { computeVoucherStatuses } from "@/services/mikrotik.service"

// POST /api/mikrotik/sync-vouchers
// Admin: sync all non-deleted vouchers
// Reseller: sync only their own vouchers
export async function POST() {
  const { user, error } = await requireAuth()
  if (error) return error

  const where =
    user.role === "reseller"
      ? { user_id: user.id, status: { not: "deleted" as const } }
      : { status: { not: "deleted" as const } }

  const vouchers = await prisma.voucher.findMany({
    where,
    select: { id: true, code: true, used_at: true, status: true, client_ip: true, client_mac: true },
  })

  if (vouchers.length === 0) {
    return NextResponse.json({ synced: 0, total: 0, message: "Tidak ada voucher untuk disinkronkan" })
  }

  let syncResults
  try {
    syncResults = await computeVoucherStatuses(
      vouchers.map((v) => ({ code: v.code, used_at: v.used_at }))
    )
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
            // When expired: keep existing client_ip (last known), do not overwrite
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
