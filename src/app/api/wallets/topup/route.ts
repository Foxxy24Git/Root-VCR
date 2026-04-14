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
    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: "Not Found", message: "User tidak ditemukan" }, { status: 404 })
    }

    if (targetUser.role !== "reseller") {
      return NextResponse.json({ error: "Bad Request", message: "User tujuan bukan reseller!" }, { status: 400 })
    }

    if (targetUser.is_frozen) {
      return NextResponse.json({ error: "Forbidden", message: "Akun reseller dibekukan, tidak bisa melakukan topup" }, { status: 403 })
    }

    // Do this inside a Prisma transaction
    const wallet = await prisma.$transaction(async (tx) => {
      // Find or create wallet
      let targetWallet = await tx.wallet.findUnique({ where: { user_id: userId } })
      
      if (!targetWallet) {
        targetWallet = await tx.wallet.create({
          data: {
            user_id: userId,
            balance: 0,
            total_topup: 0,
            total_spent: 0
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
          total_topup: type === 'topup' ? targetWallet.total_topup : targetWallet.total_topup,
          // Note: In PRD logic "total_topup" tracking might just cleanly track additions
        }
      })
      
      if (type === 'topup') {
        await tx.wallet.update({
          where: { id: targetWallet.id },
          data: { total_topup: { increment: amount } }
        })
      }

      // Log transaction
      await tx.walletLog.create({
        data: {
          wallet_id: targetWallet.id,
          admin_id: admin.id,
          type: type,
          amount: amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: description || (type === "topup" ? "Manual Top Up by Admin" : "Manual Adjustment by Admin")
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
