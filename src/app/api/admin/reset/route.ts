import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

// POST /api/admin/reset
// Resets all operational data: zero wallets, delete resellers, clear vouchers.
// Admin account is preserved.
export async function POST() {
  const { user, error } = await requireAdmin()
  if (error) return error

  await prisma.$transaction(async (tx) => {
    // 1. Delete all vouchers
    await tx.voucher.deleteMany({})

    // 2. Get all reseller user ids
    const resellers = await tx.user.findMany({
      where: { role: "reseller" },
      select: { id: true },
    })
    const resellerIds = resellers.map((r) => r.id)

    if (resellerIds.length > 0) {
      // 3. Delete wallet logs for these resellers
      const wallets = await tx.wallet.findMany({
        where: { user_id: { in: resellerIds } },
        select: { id: true },
      })
      const walletIds = wallets.map((w) => w.id)

      if (walletIds.length > 0) {
        await tx.walletLog.deleteMany({ where: { wallet_id: { in: walletIds } } })
        // 4. Delete wallets
        await tx.wallet.deleteMany({ where: { id: { in: walletIds } } })
      }

      // 5. Delete reseller profile assignments
      await tx.resellerProfile.deleteMany({ where: { user_id: { in: resellerIds } } })

      // 6. Fix any wallet logs referencing admin_id from these users
      await tx.walletLog.updateMany({
        where: { admin_id: { in: resellerIds } },
        data: { admin_id: null },
      })

      // 7. Delete reseller users
      await tx.user.deleteMany({ where: { id: { in: resellerIds } } })
    }

    // 8. Zero out any remaining wallets (e.g. if admin had one)
    await tx.wallet.updateMany({
      data: { balance: 0, total_topup: 0, total_spent: 0 },
    })
  })

  return NextResponse.json({
    message: `Reset selesai. Semua voucher, reseller, dan saldo dihapus. Admin (${user.email}) dipertahankan.`,
  })
}
