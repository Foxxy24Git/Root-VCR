import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"]
const ALLOWED_EXTS = ["jpg", "jpeg", "png", "pdf"]

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Harus multipart/form-data" },
      { status: 400 },
    )
  }

  const invoiceId = formData.get("invoice_id")
  const file = formData.get("file")
  const notes = formData.get("notes")

  if (typeof invoiceId !== "string" || !invoiceId) {
    return NextResponse.json(
      { error: "Bad Request", message: "invoice_id diperlukan" },
      { status: 400 },
    )
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Bad Request", message: "file diperlukan" },
      { status: 400 },
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Bad Request", message: "File maksimal 2MB" },
      { status: 400 },
    )
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Bad Request", message: "Format file harus JPG, PNG, atau PDF" },
      { status: 400 },
    )
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json(
      { error: "Bad Request", message: "Ekstensi file tidak diizinkan" },
      { status: 400 },
    )
  }

  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoice_number: true,
      tenant_id: true,
      status: true,
    },
  })

  if (!invoice) {
    return NextResponse.json(
      { error: "Not Found", message: "Invoice tidak ditemukan" },
      { status: 404 },
    )
  }

  if (
    user!.role === "TENANT_ADMIN" &&
    user!.tenantId !== invoice.tenant_id
  ) {
    return NextResponse.json(
      { error: "Forbidden", message: "Akses ditolak" },
      { status: 403 },
    )
  }

  if (invoice.status !== "PENDING") {
    return NextResponse.json(
      {
        error: "Bad Request",
        message: "Bukti transfer hanya bisa di-upload untuk invoice berstatus PENDING",
      },
      { status: 400 },
    )
  }

  const timestamp = Date.now()
  const safeInvoiceNum = invoice.invoice_number.replace(/[^a-zA-Z0-9-]/g, "_")
  const filename = `${safeInvoiceNum}_${timestamp}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-proofs")
  const filePath = path.join(uploadDir, filename)

  const bytes = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(bytes))

  const proofUrl = `/uploads/payment-proofs/${filename}`

  await prisma.subscriptionInvoice.update({
    where: { id: invoiceId },
    data: {
      status: "AWAITING_VERIFICATION",
      payment_proof: proofUrl,
      payment_notes: typeof notes === "string" ? notes.slice(0, 500) : null,
    },
  })

  await writeAuditLog({
    action: "invoice.proof.uploaded",
    userId: user!.id,
    tenantId: invoice.tenant_id,
    resource: `invoice:${invoiceId}`,
    metadata: { filename, invoice_number: invoice.invoice_number },
    req,
  })

  return NextResponse.json({ proof_url: proofUrl })
}
