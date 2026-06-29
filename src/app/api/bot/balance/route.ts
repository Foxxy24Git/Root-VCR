import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertBotAuth } from "@/lib/bot-auth"
import { formatRupiah } from "@/lib/utils"

// GET /api/bot/balance?phone=xxx
// Return the wallet balance of the user behind a WhatsApp number.
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
    select: { id: true, wallet: { select: { balance: true } } },
  })

  if (!user) {
    return NextResponse.json(
      { error: "Not Found", message: "Nomor tidak terdaftar di Root-VCR" },
      { status: 404 },
    )
  }
  if (!user.wallet) {
    return NextResponse.json(
      { error: "Not Found", message: "User belum memiliki wallet" },
      { status: 404 },
    )
  }

  const balance = Number(user.wallet.balance)
  return NextResponse.json({
    balance,
    balanceFormatted: formatRupiah(balance),
  })
}
