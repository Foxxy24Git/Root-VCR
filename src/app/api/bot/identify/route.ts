import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertBotAuth } from "@/lib/bot-auth"

// GET /api/bot/identify?phone=xxx
// Resolve a WhatsApp number to its Root-VCR user. Phone is matched globally
// (across tenants) because the bot doesn't know the tenant yet — it's the entry
// point that establishes who is talking.
export async function GET(req: NextRequest) {
  const unauth = assertBotAuth(req)
  if (unauth) return unauth

  const rawPhone = req.nextUrl.searchParams.get("phone")?.trim()
  if (!rawPhone) {
    return NextResponse.json(
      { error: "Bad Request", message: "Parameter 'phone' wajib diisi" },
      { status: 400 },
    )
  }

  // Normalisasi: WA kirim format internasional (628xxx), DB simpan format lokal (08xxx)
  let phone = rawPhone
  if (phone.startsWith("+62")) phone = "0" + phone.slice(3)
  else if (phone.startsWith("62")) phone = "0" + phone.slice(2)

  const user = await prisma.user.findFirst({
    where: { phone },
    select: { id: true, name: true, role: true, tenant_id: true, is_frozen: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: "Not Found", message: "Nomor tidak terdaftar di Root-VCR" },
      { status: 404 },
    )
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    role: user.role,
    tenantId: user.tenant_id,
    isFrozen: user.is_frozen,
  })
}
