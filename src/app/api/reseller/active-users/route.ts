import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { withMikrotik } from "@/lib/mikrotik"
import { HotspotActive } from "@/services/mikrotik.service"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  if (user.role !== "reseller") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Get all voucher codes belonging to this reseller
  const vouchers = await prisma.voucher.findMany({
    where: { user_id: user.id },
    select: { code: true },
  })
  const voucherCodes = new Set(vouchers.map((v) => v.code))

  // Get real-time active users from MikroTik
  let activeList: HotspotActive[] = []
  try {
    activeList = await withMikrotik((api) =>
      api.menu("/ip/hotspot/active").getAll() as Promise<HotspotActive[]>
    )
  } catch (e) {
    console.error("[active-users] MikroTik error:", e)
    return NextResponse.json({ error: "Gagal terhubung ke MikroTik" }, { status: 503 })
  }

  // Filter to only this reseller's vouchers
  const resellerActiveUsers = activeList
    .filter((u) => voucherCodes.has(u.user))
    .map((u) => ({
      username: u.user,
      ip: u.address ?? null,
      mac: u["mac-address"] ?? null,
      uptime: u.uptime ?? null,
      server: u.server ?? null,
    }))

  return NextResponse.json({ activeUsers: resellerActiveUsers })
}
