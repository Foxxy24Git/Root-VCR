import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { updateBankAccountSchema } from "@/lib/validations/bank-account"
import type { Prisma } from "@prisma/client"

type Params = { params: { id: string } }

// ─────────────────────────────────────────────────────────────────────
// PATCH /api/super-admin/bank-accounts/[id]
// ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
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

  const parsed = updateBankAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const existing = await prisma.bankAccount.findUnique({
    where: { id: params.id },
  })
  if (!existing) {
    return NextResponse.json(
      { error: "Not Found", message: "Rekening tidak ditemukan" },
      { status: 404 },
    )
  }

  const input = parsed.data
  const data: Prisma.BankAccountUpdateInput = {}
  if (input.bank_name !== undefined) data.bank_name = input.bank_name
  if (input.account_number !== undefined)
    data.account_number = input.account_number
  if (input.account_holder !== undefined)
    data.account_holder = input.account_holder
  if (input.notes !== undefined) data.notes = input.notes
  if (input.is_active !== undefined) data.is_active = input.is_active
  if (input.display_order !== undefined) data.display_order = input.display_order

  const account = await prisma.bankAccount.update({
    where: { id: params.id },
    data,
  })

  await writeAuditLog({
    action: "bank_account.updated",
    userId: user.id,
    resource: `bank_account:${account.id}`,
    metadata: { fields: Object.keys(input) },
    req,
  })

  return NextResponse.json({ bank_account: account })
}

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/super-admin/bank-accounts/[id]
// ─────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const { user, error } = await requireSuperAdmin()
  if (error) return error

  const existing = await prisma.bankAccount.findUnique({
    where: { id: params.id },
  })
  if (!existing) {
    return NextResponse.json(
      { error: "Not Found", message: "Rekening tidak ditemukan" },
      { status: 404 },
    )
  }

  await prisma.bankAccount.delete({ where: { id: params.id } })

  await writeAuditLog({
    action: "bank_account.deleted",
    userId: user.id,
    resource: `bank_account:${params.id}`,
    metadata: {
      bank_name: existing.bank_name,
      account_number: existing.account_number,
    },
    req,
  })

  return NextResponse.json({ message: "Rekening dihapus" })
}
