import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

// Helper: convert Node.js Buffer to a BodyInit-compatible ArrayBuffer
function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const format = req.nextUrl.searchParams.get("format")

  const where = user.role === "reseller" ? { user_id: user.id } : {}

  const vouchers = await prisma.voucher.findMany({
    where,
    orderBy: { generated_at: "desc" },
    include: { profile: { select: { name: true } } },
  })

  if (format === "excel") {
    const ExcelJS = await import("exceljs")
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Vouchers")

    sheet.columns = [
      { header: "Code", key: "code", width: 20 },
      { header: "Profile", key: "profile", width: 20 },
      { header: "Generated At", key: "generated_at", width: 25 },
      { header: "Used At", key: "used_at", width: 25 },
      { header: "Expired At", key: "expired_at", width: 25 },
      { header: "Status", key: "status", width: 12 },
      { header: "Client IP", key: "client_ip", width: 18 },
      { header: "Client MAC", key: "client_mac", width: 20 },
      { header: "Price (Rp)", key: "price", width: 15 },
    ]

    for (const v of vouchers) {
      sheet.addRow({
        code: v.code,
        profile: v.profile?.name ?? "-",
        generated_at: v.generated_at.toLocaleString("id-ID"),
        used_at: v.used_at?.toLocaleString("id-ID") ?? "-",
        expired_at: v.expired_at?.toLocaleString("id-ID") ?? "-",
        status: v.status,
        client_ip: v.client_ip ?? "-",
        client_mac: v.client_mac ?? "-",
        price: Number(v.price_charged),
      })
    }

    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    }

    // writeBuffer returns Buffer in Node.js — copy to clean ArrayBuffer
    const raw = Buffer.from(await workbook.xlsx.writeBuffer())
    const ab = toArrayBuffer(raw)

    return new NextResponse(new Blob([ab]), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="vouchers-${Date.now()}.xlsx"`,
      },
    })
  }

  if (format === "pdf") {
    const { default: PDFDocument } = await import("pdfkit")

    const pdfBuf = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4" })
      const chunks: Buffer[] = []

      doc.on("data", (chunk: Buffer) => chunks.push(chunk))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("Voucher Report", { align: "center" })
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Generated: ${new Date().toLocaleString("id-ID")}`, {
          align: "center",
        })
      doc.moveDown(1.5)

      const cols = { code: 40, profile: 140, generated: 230, status: 350, price: 430 }
      const rowH = 20
      let y = doc.y

      doc.fontSize(9).font("Helvetica-Bold")
      doc.rect(40, y - 4, 515, rowH).fill("#E2E8F0")
      doc.fillColor("#000000")
      doc.text("Code", cols.code, y, { width: 90 })
      doc.text("Profile", cols.profile, y, { width: 85 })
      doc.text("Generated", cols.generated, y, { width: 115 })
      doc.text("Status", cols.status, y, { width: 70 })
      doc.text("Price (Rp)", cols.price, y, { width: 90 })
      y += rowH

      doc.fontSize(8).font("Helvetica")

      vouchers.forEach((v, i) => {
        if (y > 750) {
          doc.addPage()
          y = 40
        }
        if (i % 2 === 0) {
          doc.rect(40, y - 4, 515, rowH).fill("#F8FAFC")
        }
        doc.fillColor("#000000")
        doc.text(v.code, cols.code, y, { width: 90 })
        doc.text(v.profile?.name ?? "-", cols.profile, y, { width: 85 })
        doc.text(v.generated_at.toLocaleDateString("id-ID"), cols.generated, y, { width: 115 })
        doc.text(v.status.toUpperCase(), cols.status, y, { width: 70 })
        doc.text(`${Number(v.price_charged).toLocaleString("id-ID")}`, cols.price, y, { width: 90 })
        y += rowH
      })

      doc.end()
    })

    const ab = toArrayBuffer(pdfBuf)

    return new NextResponse(new Blob([ab]), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="vouchers-${Date.now()}.pdf"`,
      },
    })
  }

  return NextResponse.json(
    { error: "Invalid format. Use ?format=excel or ?format=pdf" },
    { status: 400 }
  )
}
