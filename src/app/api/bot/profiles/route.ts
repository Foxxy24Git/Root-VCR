import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getTenantPrisma } from "@/lib/prisma-tenant"
import { assertBotAuth } from "@/lib/bot-auth"
import { formatRupiah } from "@/lib/utils"

// GET /api/bot/profiles?phone=xxx
// List the voucher packages a user may generate:
//   - RESELLER       → only profiles explicitly enabled for them (reseller_profiles)
//   - everyone else  → all active profiles in their tenant (TENANT_ADMIN)
// NOTE: the schema's Role enum is SUPER_ADMIN/TENANT_ADMIN/RESELLER (no MEMBER),
// so non-reseller tenant users fall into the "all active tenant profiles" branch.
export async function GET(req: NextRequest) {
  const unauth = assertBotAuth(req)
  if (unauth) return unauth

  const phone = req.nextUrl.searchParams.get("phone")?.trim()
  if (!phone) {
    return NextResponse.json(
      { error: "Bad Request", message: "Parameter 'phone' wajib diisi" },
      { status: 400 },
    )
  }

  const user = await prisma.user.findFirst({
    where: { phone },
    select: { id: true, role: true, tenant_id: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: "Not Found", message: "Nomor tidak terdaftar di Root-VCR" },
      { status: 404 },
    )
  }
  if (!user.tenant_id) {
    return NextResponse.json(
      { error: "Bad Request", message: "User tidak terikat ke tenant manapun" },
      { status: 400 },
    )
  }

  // From here, scope every query to the user's tenant.
  const db = getTenantPrisma(user.tenant_id)
  const profileSelect = {
    id: true,
    name: true,
    duration_days: true,
    duration_hours: true,
    price: true,
  } as const

  let profiles: Array<{
    id: string
    name: string
    duration_days: number
    duration_hours: number
    price: unknown
  }>

  if (user.role === "RESELLER") {
    const rows = await db.resellerProfile.findMany({
      where: { user_id: user.id, is_enabled: true, profile: { is_active: true } },
      select: { profile: { select: profileSelect } },
      orderBy: { profile: { price: "asc" } },
    })
    profiles = rows.map((r) => r.profile)
  } else {
    profiles = await db.profile.findMany({
      where: { is_active: true },
      orderBy: { price: "asc" },
      select: profileSelect,
    })
  }

  const result = profiles.map((p) => {
    const price = Number(p.price)
    return {
      id: p.id,
      name: p.name,
      durationDays: p.duration_days,
      durationHours: p.duration_hours,
      price,
      priceFormatted: formatRupiah(price),
    }
  })

  return NextResponse.json(result)
}
