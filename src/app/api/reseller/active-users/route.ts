import { NextResponse } from "next/server"
import { requireReseller } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { withMikrotik } from "@/lib/mikrotik"
import { HotspotActive } from "@/services/mikrotik.service"

export async function GET() {
  const { user, error } = await requireReseller()
  if (error) return error

  const tenantId = user.tenantId!

  // Get all voucher codes belonging to this reseller
  const vouchers = await prisma.voucher.findMany({
    where: { user_id: user.id, tenant_id: tenantId },
    select: { code: true },
  })
  const voucherCodes = new Set(vouchers.map((v) => v.code))

  // Get real-time active users from MikroTik
  let activeList: HotspotActive[] = []
  try {
    activeList = await withMikrotik(tenantId, (api) =>
      api.menu("/ip/hotspot/active").getAll() as Promise<HotspotActive[]>
    )
  } catch (e) {
    console.error("[active-users] MikroTik error:", e)
    return NextResponse.json({ error: "Gagal terhubung ke MikroTik" }, { status: 503 })
  }

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
