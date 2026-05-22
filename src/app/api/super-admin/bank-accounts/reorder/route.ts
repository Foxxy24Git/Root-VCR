import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { reorderBankAccountsSchema } from "@/lib/validations/bank-account"

// ─────────────────────────────────────────────────────────────────────
// POST /api/super-admin/bank-accounts/reorder
// Body: { order: ["id1", "id2", "id3", ...] }
// Set display_order sesuai urutan array (10, 20, 30, ...).
// ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { user, error } = await requireSuperAdmin()
  if (error) return error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Body JSON tidak valid" },
      { status: 400 },
    )
  }

  const parsed = reorderBankAccountsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }
  const { order } = parsed.data

  // Pastikan tidak ada ID duplikat
  if (new Set(order).size !== order.length) {
    return NextResponse.json(
      { error: "Bad Request", message: "Ada ID duplikat di list order" },
      { status: 400 },
    )
  }

  // Pastikan semua ID memang ada
  const existing = await prisma.bankAccount.findMany({
    where: { id: { in: order } },
    select: { id: true },
  })
  if (existing.length !== order.length) {
    return NextResponse.json(
      {
        error: "Bad Request",
        message: "Sebagian ID rekening tidak ditemukan",
      },
      { status: 400 },
    )
  }

  await prisma.$transaction(
    order.map((id, idx) =>
      prisma.bankAccount.update({
        where: { id },
        data: { display_order: (idx + 1) * 10 },
      }),
    ),
  )

  await writeAuditLog({
    action: "bank_account.reordered",
    userId: user.id,
    resource: "bank_account:reorder",
    metadata: { count: order.length },
    req,
  })

  return NextResponse.json({ message: "Urutan rekening diperbarui" })
}
