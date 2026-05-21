import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

const KEYS = ["whatsapp_number", "whatsapp_topup_message", "whatsapp_withdraw_message"] as const
type ContactKey = (typeof KEYS)[number]

const PHONE_RE = /^(08|628)\d{8,12}$/

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const rows = await prisma.setting.findMany({ where: { key: { in: [...KEYS] } } })
  const result: Record<ContactKey, string | null> = {
    whatsapp_number: null,
    whatsapp_topup_message: null,
    whatsapp_withdraw_message: null,
  }
  rows.forEach(r => { result[r.key as ContactKey] = r.value })
  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  let body: Partial<Record<ContactKey, string>>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Bad Request", message: "Body tidak valid" }, { status: 400 })
  }

  const number = body.whatsapp_number?.trim()
  const topup = body.whatsapp_topup_message?.trim()
  const withdraw = body.whatsapp_withdraw_message?.trim()

  if (!number || !PHONE_RE.test(number)) {
    return NextResponse.json(
      { error: "Validation Error", message: "Format nomor WhatsApp tidak valid (08xx atau 628xx)" },
      { status: 422 }
    )
  }
  if (!topup) {
    return NextResponse.json(
      { error: "Validation Error", message: "Template Topup wajib diisi" },
      { status: 422 }
    )
  }
  if (!withdraw) {
    return NextResponse.json(
      { error: "Validation Error", message: "Template Withdraw wajib diisi" },
      { status: 422 }
    )
  }

  const updates: Array<{ key: ContactKey; value: string }> = [
    { key: "whatsapp_number", value: number },
    { key: "whatsapp_topup_message", value: topup },
    { key: "whatsapp_withdraw_message", value: withdraw },
  ]

  try {
    await prisma.$transaction(
      updates.map(u =>
        prisma.setting.upsert({
          where: { key: u.key },
          update: { value: u.value, type: "string" },
          create: { key: u.key, value: u.value, type: "string" },
        })
      )
    )
    return NextResponse.json({ message: "Pengaturan kontak tersimpan" })
  } catch {
    return NextResponse.json({ error: "Server Error", message: "Gagal menyimpan" }, { status: 500 })
  }
}
