import { NextRequest, NextResponse } from "next/server"
import { getTenantScope } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

// POST /api/admin/reset
// Resets operational data ONLY for current tenant: zero wallets, delete resellers, clear vouchers.
// Tenant admin account is preserved. Does NOT affect other tenants.
export async function POST(req: NextRequest) {
  const { ctx, db, error } = await getTenantScope(
    req.nextUrl.searchParams.get("tenantId")
  )
  if (error) return error

  if (ctx.role !== "TENANT_ADMIN" && ctx.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await db.$transaction(async (tx) => {
    // 1. Delete all vouchers in this tenant (auto-injected)
    await tx.voucher.deleteMany({})

    // 2. Get all reseller user ids in this tenant
    const resellers = await tx.user.findMany({
      where: { role: "RESELLER" },
      select: { id: true },
    })
    const resellerIds = resellers.map((r) => r.id)

    if (resellerIds.length > 0) {
      const wallets = await tx.wallet.findMany({
        where: { user_id: { in: resellerIds } },
        select: { id: true },
      })
      const walletIds = wallets.map((w) => w.id)

      if (walletIds.length > 0) {
        await tx.walletLog.deleteMany({ where: { wallet_id: { in: walletIds } } })
        await tx.wallet.deleteMany({ where: { id: { in: walletIds } } })
      }

      await tx.resellerProfile.deleteMany({ where: { user_id: { in: resellerIds } } })

      await tx.walletLog.updateMany({
        where: { admin_id: { in: resellerIds } },
        data: { admin_id: null },
      })

      await tx.user.deleteMany({ where: { id: { in: resellerIds } } })
    }

    // Zero out remaining wallets in tenant (e.g. if admin had one) — tenant_id auto-injected
    await tx.wallet.updateMany({
      where: {},
      data: { balance: 0, total_topup: 0, total_spent: 0 },
    })
  })

  // Look up admin email for the success message (raw prisma — SUPER_ADMIN has nullable tenant_id)
  const adminUser = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true },
  })

  return NextResponse.json({
    message: `Reset selesai. Semua voucher, reseller, dan saldo di tenant ini dihapus. Admin (${adminUser?.email ?? ctx.userId}) dipertahankan.`,
  })
}
