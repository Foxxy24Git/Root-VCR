import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

// POST /api/admin/reset
// Resets operational data ONLY for current tenant: zero wallets, delete resellers, clear vouchers.
// Tenant admin account is preserved. Does NOT affect other tenants.
export async function POST() {
  const { user, error } = await requireAdmin()
  if (error) return error

  const tenantId = user.tenantId!

  await prisma.$transaction(async (tx) => {
    // 1. Delete all vouchers in this tenant
    await tx.voucher.deleteMany({ where: { tenant_id: tenantId } })

    // 2. Get all reseller user ids in this tenant
    const resellers = await tx.user.findMany({
      where: { role: "RESELLER", tenant_id: tenantId },
      select: { id: true },
    })
    const resellerIds = resellers.map((r) => r.id)

    if (resellerIds.length > 0) {
      const wallets = await tx.wallet.findMany({
        where: { user_id: { in: resellerIds }, tenant_id: tenantId },
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

    // Zero out remaining wallets in tenant (e.g. if admin had one)
    await tx.wallet.updateMany({
      where: { tenant_id: tenantId },
      data: { balance: 0, total_topup: 0, total_spent: 0 },
    })
  })

  return NextResponse.json({
    message: `Reset selesai. Semua voucher, reseller, dan saldo di tenant ini dihapus. Admin (${user.email}) dipertahankan.`,
  })
}
