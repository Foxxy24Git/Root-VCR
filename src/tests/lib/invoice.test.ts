import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock prisma before importing the module under test
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscriptionInvoice: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    tenant: {
      update: vi.fn(),
    },
  },
}))

import { buildInvoiceNumber, generateInvoice, verifyPayment, rejectPayment } from "@/lib/invoice"
import { prisma } from "@/lib/prisma"

const mockPrisma = prisma as unknown as {
  subscriptionInvoice: {
    findFirst: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
  }
  tenant: {
    update: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("buildInvoiceNumber", () => {
  it("returns correct format INV-YYYYMMDD-slug-seq", () => {
    const date = new Date("2026-05-23T10:00:00Z")
    const result = buildInvoiceNumber("wificepat", 3, date)
    expect(result).toBe("INV-20260523-wificepat-003")
  })

  it("pads sequence number to 3 digits", () => {
    const date = new Date("2026-01-01T00:00:00Z")
    expect(buildInvoiceNumber("slug", 1, date)).toBe("INV-20260101-slug-001")
    expect(buildInvoiceNumber("slug", 42, date)).toBe("INV-20260101-slug-042")
    expect(buildInvoiceNumber("slug", 100, date)).toBe("INV-20260101-slug-100")
  })

  it("uses current date when not provided", () => {
    const before = new Date()
    const result = buildInvoiceNumber("slug", 1)
    const year = before.getUTCFullYear()
    expect(result).toMatch(new RegExp(`^INV-${year}`))
  })
})

describe("generateInvoice", () => {
  it("throws if invoice creation fails", async () => {
    mockPrisma.subscriptionInvoice.count.mockResolvedValue(0)
    mockPrisma.subscriptionInvoice.create.mockImplementation(() => {
      throw new Error("tenant not found")
    })
    await expect(
      generateInvoice({
        tenantId: "t1",
        tenantSlug: "slug",
        planPrice: 99000,
        periodStart: new Date("2026-06-01"),
        periodEnd: new Date("2026-07-01"),
      })
    ).rejects.toThrow()
  })

  it("creates invoice with correct data", async () => {
    mockPrisma.subscriptionInvoice.count.mockResolvedValue(2)
    mockPrisma.subscriptionInvoice.create.mockResolvedValue({
      id: "inv-1",
      invoice_number: "INV-20260523-slug-003",
      amount: 99000,
      status: "PENDING",
      tenant_id: "t1",
    })

    const result = await generateInvoice({
      tenantId: "t1",
      tenantSlug: "slug",
      planPrice: 99000,
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-07-01"),
      now: new Date("2026-05-23"),
    })

    expect(mockPrisma.subscriptionInvoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenant_id: "t1",
        amount: 99000,
        status: "PENDING",
      }),
    })
    expect(result.invoice_number).toBe("INV-20260523-slug-003")
  })
})

describe("verifyPayment", () => {
  it("updates invoice to PAID and extends subscription", async () => {
    mockPrisma.subscriptionInvoice.findUnique.mockResolvedValue({
      id: "inv-1",
      tenant_id: "t1",
      status: "AWAITING_VERIFICATION",
      period_start: new Date("2026-06-01"),
      period_end: new Date("2026-07-01"),
    })
    mockPrisma.subscriptionInvoice.update.mockResolvedValue({
      id: "inv-1",
      tenant_id: "t1",
      status: "PAID",
      invoice_number: "INV-20260523-slug-001",
    })
    mockPrisma.tenant.update.mockResolvedValue({})

    await verifyPayment({
      invoiceId: "inv-1",
      verifiedBy: "user-super",
      paymentMethod: "BCA Transfer",
      paidAt: new Date("2026-06-15"),
    })

    expect(mockPrisma.subscriptionInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-1" },
        data: expect.objectContaining({ status: "PAID", verified_by: "user-super" }),
      })
    )
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: expect.objectContaining({ is_active: true, is_trial: false }),
      })
    )
  })

  it("throws if invoice not found", async () => {
    mockPrisma.subscriptionInvoice.findUnique.mockResolvedValue(null)
    await expect(
      verifyPayment({
        invoiceId: "bad-id",
        verifiedBy: "user-1",
        paymentMethod: "BCA",
        paidAt: new Date(),
      })
    ).rejects.toThrow("Invoice tidak ditemukan")
  })

  it("throws if invoice is not awaiting verification", async () => {
    mockPrisma.subscriptionInvoice.findUnique.mockResolvedValue({
      id: "inv-1",
      tenant_id: "t1",
      status: "PAID",
      period_start: new Date("2026-06-01"),
      period_end: new Date("2026-07-01"),
    })
    await expect(
      verifyPayment({
        invoiceId: "inv-1",
        verifiedBy: "user-1",
        paymentMethod: "BCA",
        paidAt: new Date(),
      })
    ).rejects.toThrow("status tidak valid")
  })
})

describe("rejectPayment", () => {
  it("resets invoice back to PENDING with reason", async () => {
    mockPrisma.subscriptionInvoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "AWAITING_VERIFICATION",
    })
    mockPrisma.subscriptionInvoice.update.mockResolvedValue({ id: "inv-1", status: "PENDING" })

    await rejectPayment({ invoiceId: "inv-1", reason: "Bukti tidak jelas" })

    expect(mockPrisma.subscriptionInvoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: expect.objectContaining({
        status: "PENDING",
        rejected_reason: "Bukti tidak jelas",
        payment_proof: null,
        payment_notes: null,
      }),
    })
  })

  it("throws if invoice not found", async () => {
    mockPrisma.subscriptionInvoice.findUnique.mockResolvedValue(null)
    await expect(
      rejectPayment({ invoiceId: "bad", reason: "test" })
    ).rejects.toThrow("Invoice tidak ditemukan")
  })
})
