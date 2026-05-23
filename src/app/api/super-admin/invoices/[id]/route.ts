import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: params.id },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          owner_name: true,
          owner_email: true,
        },
      },
    },
  })

  if (!invoice) {
    return NextResponse.json(
      { error: "Not Found", message: "Invoice tidak ditemukan" },
      { status: 404 },
    )
  }

  return NextResponse.json({ invoice })
}
