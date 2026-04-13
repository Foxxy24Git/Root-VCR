import { NextRequest, NextResponse } from "next/server"
import { requireAuth, paginate } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

// GET /api/vouchers
// Admin: semua voucher | Reseller: voucher milik sendiri
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = req.nextUrl
  const page    = parseInt(searchParams.get("page")   ?? "1")
  const limit   = parseInt(searchParams.get("limit")  ?? "20")
  const status  = searchParams.get("status")  // unused|active|expired|deleted
  const profileId = searchParams.get("profileId")
  const search  = searchParams.get("search")  ?? ""
  const { take, skip } = paginate(page, limit)

  const where = {
    // Reseller hanya lihat voucher mereka sendiri
    ...(user.role === "reseller" ? { user_id: user.id } : {}),
    ...(status ? { status: status as "unused" | "active" | "expired" | "deleted" } : {}),
    ...(profileId ? { profile_id: profileId } : {}),
    ...(search ? { code: { contains: search, mode: "insensitive" as const } } : {}),
  }

  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      skip,
      take,
      orderBy: { generated_at: "desc" },
      select: {
        id: true,
        code: true,
        status: true,
        price_charged: true,
        generated_at: true,
        used_at: true,
        expired_at: true,
        client_ip: true,
        client_mac: true,
        mikrotik_synced: true,
        user: { select: { id: true, name: true, email: true } },
        profile: { select: { id: true, name: true, duration_days: true } },
      },
    }),
    prisma.voucher.count({ where }),
  ])

  return NextResponse.json({
    vouchers,
    pagination: { page, limit: take, total, pages: Math.ceil(total / take) },
  })
}
