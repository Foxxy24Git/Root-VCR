import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { withMikrotik } from "@/lib/mikrotik"
import { HotspotActive } from "@/services/mikrotik.service"

export async function GET(req: NextRequest) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "RESELLER") {
    return NextResponse.json({ error: "Forbidden", message: "Hanya Reseller" }, { status: 403 })
  }

  // Get all voucher codes belonging to this reseller (tenant_id auto-injected)
  const vouchers = await db.voucher.findMany({
    where: { user_id: ctx.userId },
    select: { code: true },
  })
  const voucherCodes = new Set(vouchers.map((v) => v.code))

  // Get real-time active users from MikroTik
  let activeList: HotspotActive[] = []
  try {
    activeList = await withMikrotik(ctx.tenantId, (api) =>
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
