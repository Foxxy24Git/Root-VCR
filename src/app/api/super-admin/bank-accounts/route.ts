import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { createBankAccountSchema } from "@/lib/validations/bank-account"
import type { Prisma } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────
// GET /api/super-admin/bank-accounts
//   ?activeOnly=true   (default: false — return semua)
// ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true"
  const where: Prisma.BankAccountWhereInput = {}
  if (activeOnly) where.is_active = true

  const accounts = await prisma.bankAccount.findMany({
    where,
    orderBy: [{ display_order: "asc" }, { created_at: "asc" }],
  })

  return NextResponse.json({ bank_accounts: accounts })
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/super-admin/bank-accounts
// Jika display_order tidak diisi → otomatis taruh paling bawah.
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

  const parsed = createBankAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }
  const data = parsed.data

  let displayOrder = data.display_order
  if (displayOrder === undefined || displayOrder === 0) {
    const last = await prisma.bankAccount.findFirst({
      orderBy: { display_order: "desc" },
      select: { display_order: true },
    })
    displayOrder = (last?.display_order ?? 0) + 10
  }

  const account = await prisma.bankAccount.create({
    data: {
      bank_name: data.bank_name,
      account_number: data.account_number,
      account_holder: data.account_holder,
      notes: data.notes ?? null,
      is_active: data.is_active,
      display_order: displayOrder,
    },
  })

  await writeAuditLog({
    action: "bank_account.created",
    userId: user.id,
    resource: `bank_account:${account.id}`,
    metadata: {
      bank_name: account.bank_name,
      account_number: account.account_number,
    },
    req,
  })

  return NextResponse.json({ bank_account: account }, { status: 201 })
}
