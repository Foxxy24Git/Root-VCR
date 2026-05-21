import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const topupSchema = z.object({
  userId: z.string().uuid("ID User tidak valid"),
  amount: z.number().positive("Jumlah harus lebih dari 0"),
  type: z.enum(["topup", "adjustment"]),
  description: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { user: admin, error } = await requireAdmin()
  if (error) return error

  const tenantId = admin.tenantId!

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Bad Request", message: "Body tidak valid" }, { status: 400 })
  }

  const parsed = topupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { userId, amount, type, description } = parsed.data

  try {
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenant_id: tenantId },
    })
    if (!targetUser) {
      return NextResponse.json({ error: "Not Found", message: "User tidak ditemukan" }, { status: 404 })
    }

    if (targetUser.role !== "RESELLER") {
      return NextResponse.json({ error: "Bad Request", message: "User tujuan bukan reseller!" }, { status: 400 })
    }

    if (targetUser.is_frozen) {
      return NextResponse.json({ error: "Forbidden", message: "Akun reseller dibekukan, tidak bisa melakukan topup" }, { status: 403 })
    }

    const wallet = await prisma.$transaction(async (tx) => {
      let targetWallet = await tx.wallet.findUnique({ where: { user_id: userId } })

      if (!targetWallet) {
        targetWallet = await tx.wallet.create({
          data: {
            user_id: userId,
            balance: 0,
            total_topup: 0,
            total_spent: 0,
            tenant_id: tenantId,
          }
        })
      }

      const balanceBefore = Number(targetWallet.balance)
      const balanceAfter = type === 'topup' ? balanceBefore + amount : balanceBefore - amount

      if (balanceAfter < 0 && type === 'adjustment') {
        throw new Error("Adjustment cannot result in negative balance")
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: targetWallet.id },
        data: {
          balance: balanceAfter,
        }
      })

      if (type === 'topup') {
        await tx.wallet.update({
          where: { id: targetWallet.id },
          data: { total_topup: { increment: amount } }
        })
      }

      await tx.walletLog.create({
        data: {
          wallet_id: targetWallet.id,
          admin_id: admin.id,
          type: type,
          amount: amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: description || (type === "topup" ? "Manual Top Up by Admin" : "Manual Adjustment by Admin"),
          tenant_id: tenantId,
        }
      })

      return updatedWallet
    })

    return NextResponse.json({ message: "Berhasil memproses saldo", wallet })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan"
    if (msg.includes("negative balance")) {
      return NextResponse.json({ error: "Bad Request", message: "Saldo tidak boleh minus" }, { status: 400 })
    }
    return NextResponse.json({ error: "Server Error", message: "Gagal memproses saldo" }, { status: 500 })
  }
}
