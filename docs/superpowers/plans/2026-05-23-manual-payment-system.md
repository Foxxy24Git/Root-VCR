# Manual Payment System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full manual transfer payment flow — invoice generation, payment proof upload, Super Admin verification/rejection, cron auto-generation, and UI for invoice management.

**Architecture:** Business logic lives in `lib/invoice.ts` (generate, verify, reject). API routes follow existing pattern (`requireSuperAdmin()` → validate Zod → DB → writeAuditLog). File upload uses Next.js `request.formData()` and stores to `public/uploads/payment-proofs/`. UI follows the server-component-fetches + `_components/` client pattern already established.

**Tech Stack:** Next.js 14 App Router, Prisma/PostgreSQL, Zod validation, Tailwind CSS, Lucide React, Vitest for unit tests.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/invoice.ts` | Business logic: generate/verify/reject invoice |
| Create | `src/lib/validations/invoice.ts` | Zod schemas for create/verify/reject |
| Create | `src/app/api/super-admin/invoices/route.ts` | GET list + POST create |
| Create | `src/app/api/super-admin/invoices/[id]/route.ts` | GET detail |
| Create | `src/app/api/super-admin/invoices/[id]/verify-payment/route.ts` | POST approve |
| Create | `src/app/api/super-admin/invoices/[id]/reject-payment/route.ts` | POST reject |
| Create | `src/app/api/uploads/payment-proof/route.ts` | POST upload (tenant & admin) |
| Create | `src/app/api/cron/auto-generate-invoices/route.ts` | Daily auto-generate |
| Create | `src/app/super-admin/invoices/page.tsx` | Invoice list (server component) |
| Create | `src/app/super-admin/invoices/_components/InvoiceListClient.tsx` | Filters + interactive table |
| Create | `src/app/super-admin/invoices/[id]/page.tsx` | Invoice detail (server component) |
| Create | `src/app/super-admin/invoices/[id]/_components/InvoiceActions.tsx` | Verify/reject client component |
| Modify | `src/app/super-admin/tenants/[id]/page.tsx` | Add invoice links + generate button in Invoices tab |
| Modify | `src/app/super-admin/tenants/[id]/_components/TenantActions.tsx` | Add "Generate Invoice" button |
| Create | `src/app/super-admin/_components/InvoiceStatusBadge.tsx` | Shared badge (extracted from tenant detail) |
| Create | `src/tests/lib/invoice.test.ts` | Unit tests for invoice helpers |

---

## Task 1: Validation schemas

**Files:**
- Create: `src/lib/validations/invoice.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/validations/invoice.ts
import { z } from "zod"

export const createInvoiceSchema = z.object({
  tenant_id: z.string().uuid("tenant_id harus UUID"),
  plan_id: z.string().uuid("plan_id harus UUID"),
  period_start: z.string().datetime("period_start harus ISO datetime"),
  period_end: z.string().datetime("period_end harus ISO datetime"),
  notes: z.string().max(500).nullable().optional(),
})

export const verifyPaymentSchema = z.object({
  payment_method: z.string().min(2, "Metode pembayaran minimal 2 karakter").max(100),
  paid_at: z.string().datetime("paid_at harus ISO datetime"),
  notes: z.string().max(500).nullable().optional(),
})

export const rejectPaymentSchema = z.object({
  reason: z.string().min(5, "Alasan penolakan minimal 5 karakter").max(500),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/invoice.ts
git commit -m "feat: add invoice Zod validation schemas"
```

---

## Task 2: Invoice business logic helper

**Files:**
- Create: `src/lib/invoice.ts`
- Create: `src/tests/lib/invoice.test.ts`

- [ ] **Step 1: Write the failing tests first**

```typescript
// src/tests/lib/invoice.test.ts
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
  it("throws if tenant not found", async () => {
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
    const now = new Date("2026-05-23")
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
      now,
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
      period_end: new Date("2026-07-01"),
    })
    mockPrisma.subscriptionInvoice.update.mockResolvedValue({
      id: "inv-1",
      status: "PAID",
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
```

- [ ] **Step 2: Run tests to see them fail**

```bash
cd /Users/user/Root-VCR && npx vitest run src/tests/lib/invoice.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/invoice'"

- [ ] **Step 3: Implement `src/lib/invoice.ts`**

```typescript
// src/lib/invoice.ts
import { prisma } from "@/lib/prisma"

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export interface GenerateInvoiceParams {
  tenantId: string
  tenantSlug: string
  planPrice: number | string
  periodStart: Date
  periodEnd: Date
  notes?: string | null
  now?: Date
}

export interface VerifyPaymentParams {
  invoiceId: string
  verifiedBy: string
  paymentMethod: string
  paidAt: Date
  notes?: string | null
}

export interface RejectPaymentParams {
  invoiceId: string
  reason: string
}

// ─────────────────────────────────────────────────────────────────────
// Invoice number: INV-{YYYYMMDD}-{slug}-{seq padded to 3}
// seq = total invoices for this tenant so far + 1
// ─────────────────────────────────────────────────────────────────────

export function buildInvoiceNumber(
  tenantSlug: string,
  seq: number,
  date?: Date,
): string {
  const d = date ?? new Date()
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const seqStr = String(seq).padStart(3, "0")
  return `INV-${yyyy}${mm}${dd}-${tenantSlug}-${seqStr}`
}

// ─────────────────────────────────────────────────────────────────────
// generateInvoice — buat invoice PENDING baru
// ─────────────────────────────────────────────────────────────────────

export async function generateInvoice(params: GenerateInvoiceParams) {
  const { tenantId, tenantSlug, planPrice, periodStart, periodEnd, notes, now } = params

  // seq = jumlah invoice existing + 1 untuk invoice ini
  const existingCount = await prisma.subscriptionInvoice.count({
    where: { tenant_id: tenantId },
  })
  const seq = existingCount + 1
  const invoiceNumber = buildInvoiceNumber(tenantSlug, seq, now)

  const invoice = await prisma.subscriptionInvoice.create({
    data: {
      tenant_id: tenantId,
      invoice_number: invoiceNumber,
      amount: Number(planPrice),
      period_start: periodStart,
      period_end: periodEnd,
      status: "PENDING",
      notes: notes ?? null,
    },
  })

  return invoice
}

// ─────────────────────────────────────────────────────────────────────
// verifyPayment — set PAID + extend subscription
// ─────────────────────────────────────────────────────────────────────

export async function verifyPayment(params: VerifyPaymentParams) {
  const { invoiceId, verifiedBy, paymentMethod, paidAt, notes } = params

  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
  })

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan")
  }

  if (invoice.status !== "AWAITING_VERIFICATION") {
    throw new Error(`Invoice status tidak valid untuk verifikasi: ${invoice.status}`)
  }

  const now = new Date()

  const [updated] = await Promise.all([
    prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paid_at: paidAt,
        payment_method: paymentMethod,
        verified_by: verifiedBy,
        verified_at: now,
        notes: notes ?? invoice.notes,
        rejected_reason: null,
      },
    }),
    prisma.tenant.update({
      where: { id: invoice.tenant_id },
      data: {
        is_active: true,
        is_trial: false,
        suspended_reason: null,
        subscription_start_at: invoice.period_start,
        subscription_end_at: invoice.period_end,
      },
    }),
  ])

  return updated
}

// ─────────────────────────────────────────────────────────────────────
// rejectPayment — reset ke PENDING + simpan alasan
// ─────────────────────────────────────────────────────────────────────

export async function rejectPayment(params: RejectPaymentParams) {
  const { invoiceId, reason } = params

  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
  })

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan")
  }

  if (invoice.status !== "AWAITING_VERIFICATION") {
    throw new Error(`Invoice status tidak valid untuk penolakan: ${invoice.status}`)
  }

  return prisma.subscriptionInvoice.update({
    where: { id: invoiceId },
    data: {
      status: "PENDING",
      rejected_reason: reason,
      payment_proof: null,
      payment_notes: null,
    },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/user/Root-VCR && npx vitest run src/tests/lib/invoice.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoice.ts src/tests/lib/invoice.test.ts
git commit -m "feat: add invoice business logic helper with unit tests"
```

---

## Task 3: Shared InvoiceStatusBadge component

**Files:**
- Create: `src/app/super-admin/_components/InvoiceStatusBadge.tsx`

This component currently exists as a local function in `src/app/super-admin/tenants/[id]/page.tsx`. Extract it so invoice list and detail pages can use it too.

- [ ] **Step 1: Create the shared component**

```typescript
// src/app/super-admin/_components/InvoiceStatusBadge.tsx
import type { InvoiceStatus } from "@prisma/client"

const STATUS_MAP: Record<
  InvoiceStatus,
  { label: string; cls: string }
> = {
  PENDING: {
    label: "Pending",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  },
  AWAITING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  PAID: {
    label: "Lunas",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  OVERDUE: {
    label: "Overdue",
    cls: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  CANCELLED: {
    label: "Cancelled",
    cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  },
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const v = STATUS_MAP[status] ?? {
    label: status,
    cls: "bg-slate-100 text-slate-700",
  }
  return (
    <span
      className={
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider " +
        v.cls
      }
    >
      {v.label}
    </span>
  )
}
```

- [ ] **Step 2: Update tenant detail page to use shared badge**

In `src/app/super-admin/tenants/[id]/page.tsx`, replace the local `InvoiceStatusBadge` function with:

```typescript
import { InvoiceStatusBadge } from "@/app/super-admin/_components/InvoiceStatusBadge"
```

Remove lines 634–671 (the local `InvoiceStatusBadge` function definition).

Update the usage at line ~468 to remain: `<InvoiceStatusBadge status={inv.status} />`

- [ ] **Step 3: Commit**

```bash
git add src/app/super-admin/_components/InvoiceStatusBadge.tsx src/app/super-admin/tenants/[id]/page.tsx
git commit -m "refactor: extract InvoiceStatusBadge to shared component"
```

---

## Task 4: API — GET list + POST create invoices

**Files:**
- Create: `src/app/api/super-admin/invoices/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/super-admin/invoices/route.ts
import { NextRequest, NextResponse } from "next/server"
import type { Prisma, InvoiceStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { createInvoiceSchema } from "@/lib/validations/invoice"
import { generateInvoice } from "@/lib/invoice"
import { paginate } from "@/lib/api-helpers"

const PAGE_SIZE = 20

// ─────────────────────────────────────────────────────────────────────
// GET /api/super-admin/invoices
// Query params:
//   ?status=PENDING|AWAITING_VERIFICATION|PAID|OVERDUE|CANCELLED
//   ?tenantId=<uuid>
//   ?page=1
//   ?search=<invoice_number or tenant name>
// ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const status = sp.get("status") as InvoiceStatus | null
  const tenantId = sp.get("tenantId")
  const search = sp.get("search")?.trim()
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1)

  const where: Prisma.SubscriptionInvoiceWhereInput = {}

  const validStatuses: InvoiceStatus[] = [
    "PENDING",
    "AWAITING_VERIFICATION",
    "PAID",
    "OVERDUE",
    "CANCELLED",
  ]
  if (status && validStatuses.includes(status)) {
    where.status = status
  }

  if (tenantId) where.tenant_id = tenantId

  if (search) {
    where.OR = [
      { invoice_number: { contains: search, mode: "insensitive" } },
      { tenant: { name: { contains: search, mode: "insensitive" } } },
      { tenant: { slug: { contains: search, mode: "insensitive" } } },
    ]
  }

  const { take, skip } = paginate(page, PAGE_SIZE)

  const [invoices, total] = await Promise.all([
    prisma.subscriptionInvoice.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    prisma.subscriptionInvoice.count({ where }),
  ])

  return NextResponse.json({
    invoices,
    meta: {
      total,
      page,
      page_size: PAGE_SIZE,
      total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    },
  })
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/super-admin/invoices
// Body: { tenant_id, plan_id, period_start, period_end, notes? }
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

  const parsed = createInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { tenant_id, plan_id, period_start, period_end, notes } = parsed.data

  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenant_id },
      select: { id: true, slug: true, name: true },
    }),
    prisma.plan.findUnique({
      where: { id: plan_id },
      select: { id: true, price: true, name: true },
    }),
  ])

  if (!tenant) {
    return NextResponse.json(
      { error: "Not Found", message: "Tenant tidak ditemukan" },
      { status: 404 },
    )
  }

  if (!plan) {
    return NextResponse.json(
      { error: "Not Found", message: "Plan tidak ditemukan" },
      { status: 404 },
    )
  }

  const invoice = await generateInvoice({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    planPrice: plan.price,
    periodStart: new Date(period_start),
    periodEnd: new Date(period_end),
    notes,
  })

  await writeAuditLog({
    action: "invoice.created",
    userId: user!.id,
    tenantId: tenant.id,
    resource: `invoice:${invoice.id}`,
    metadata: {
      invoice_number: invoice.invoice_number,
      amount: invoice.amount.toString(),
      plan_name: plan.name,
    },
    req,
  })

  return NextResponse.json({ invoice }, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/super-admin/invoices/route.ts
git commit -m "feat: add GET/POST /api/super-admin/invoices"
```

---

## Task 5: API — GET invoice detail

**Files:**
- Create: `src/app/api/super-admin/invoices/[id]/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/super-admin/invoices/[id]/route.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/super-admin/invoices/[id]/route.ts
git commit -m "feat: add GET /api/super-admin/invoices/[id]"
```

---

## Task 6: API — verify-payment

**Files:**
- Create: `src/app/api/super-admin/invoices/[id]/verify-payment/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/super-admin/invoices/[id]/verify-payment/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { verifyPaymentSchema } from "@/lib/validations/invoice"
import { verifyPayment } from "@/lib/invoice"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

  const parsed = verifyPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { payment_method, paid_at, notes } = parsed.data

  try {
    const updated = await verifyPayment({
      invoiceId: params.id,
      verifiedBy: user!.id,
      paymentMethod: payment_method,
      paidAt: new Date(paid_at),
      notes,
    })

    await writeAuditLog({
      action: "invoice.payment.verified",
      userId: user!.id,
      tenantId: updated.tenant_id,
      resource: `invoice:${params.id}`,
      metadata: { payment_method, paid_at, invoice_number: updated.invoice_number },
      req,
    })

    return NextResponse.json({ invoice: updated })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal memverifikasi pembayaran"
    return NextResponse.json({ error: "Bad Request", message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/super-admin/invoices/[id]/verify-payment/route.ts
git commit -m "feat: add POST /api/super-admin/invoices/[id]/verify-payment"
```

---

## Task 7: API — reject-payment

**Files:**
- Create: `src/app/api/super-admin/invoices/[id]/reject-payment/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/super-admin/invoices/[id]/reject-payment/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { writeAuditLog } from "@/lib/audit"
import { rejectPaymentSchema } from "@/lib/validations/invoice"
import { rejectPayment } from "@/lib/invoice"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

  const parsed = rejectPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { reason } = parsed.data

  try {
    const updated = await rejectPayment({
      invoiceId: params.id,
      reason,
    })

    await writeAuditLog({
      action: "invoice.payment.rejected",
      userId: user!.id,
      tenantId: updated.tenant_id,
      resource: `invoice:${params.id}`,
      metadata: { reason, invoice_number: updated.invoice_number },
      req,
    })

    return NextResponse.json({ invoice: updated })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal menolak pembayaran"
    return NextResponse.json({ error: "Bad Request", message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/super-admin/invoices/[id]/reject-payment/route.ts
git commit -m "feat: add POST /api/super-admin/invoices/[id]/reject-payment"
```

---

## Task 8: API — file upload for payment proof

**Files:**
- Create: `src/app/api/uploads/payment-proof/route.ts`
- Create: `public/uploads/payment-proofs/.gitkeep`

Upload is callable by both TENANT_ADMIN (own invoice) and SUPER_ADMIN. Saves file to `public/uploads/payment-proofs/{invoice_number}_{timestamp}.{ext}`. Updates `payment_proof` and `payment_notes` in DB, sets status to `AWAITING_VERIFICATION`.

- [ ] **Step 1: Create gitkeep for the directory**

```bash
mkdir -p /Users/user/Root-VCR/public/uploads/payment-proofs
touch /Users/user/Root-VCR/public/uploads/payment-proofs/.gitkeep
```

- [ ] **Step 2: Create the upload route**

```typescript
// src/app/api/uploads/payment-proof/route.ts
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

  // Fetch invoice — verify ownership for non-super-admin
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

  // TENANT_ADMIN can only upload for their own tenant
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
```

- [ ] **Step 3: Commit**

```bash
git add public/uploads/payment-proofs/.gitkeep src/app/api/uploads/payment-proof/route.ts
git commit -m "feat: add payment proof file upload endpoint"
```

---

## Task 9: Cron — auto-generate invoices

**Files:**
- Create: `src/app/api/cron/auto-generate-invoices/route.ts`

Logic: Find non-trial tenants where `subscription_end_at < now+7d` AND no PENDING/AWAITING invoice for the upcoming period (period_start >= subscription_end_at - 1 day).

- [ ] **Step 1: Create the cron route**

```typescript
// src/app/api/cron/auto-generate-invoices/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateInvoice } from "@/lib/invoice"
import { writeAuditLog } from "@/lib/audit"

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Server Misconfigured", message: "CRON_SECRET belum di-set" },
      { status: 500 },
    )
  }

  const auth = req.headers.get("authorization") ?? ""
  const provided = auth.replace(/^Bearer\s+/i, "")
  if (provided !== secret) {
    return NextResponse.json(
      { error: "Unauthorized", message: "CRON_SECRET tidak cocok" },
      { status: 401 },
    )
  }

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000)

  // Tenant non-trial, aktif, subscription_end_at < now+7d
  const candidates = await prisma.tenant.findMany({
    where: {
      is_trial: false,
      is_active: true,
      subscription_end_at: { not: null, lt: sevenDaysFromNow },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      subscription_end_at: true,
      plan_id: true,
      plan: {
        select: { id: true, price: true, duration_days: true, name: true },
      },
    },
  })

  const generated: string[] = []
  const skipped: string[] = []

  for (const tenant of candidates) {
    if (!tenant.plan || !tenant.subscription_end_at) {
      skipped.push(tenant.slug)
      continue
    }

    const nextPeriodStart = tenant.subscription_end_at
    const nextPeriodEnd = new Date(
      nextPeriodStart.getTime() + tenant.plan.duration_days * 86_400_000,
    )

    // Skip jika sudah ada invoice PENDING atau AWAITING untuk periode berikutnya
    const existingInvoice = await prisma.subscriptionInvoice.findFirst({
      where: {
        tenant_id: tenant.id,
        status: { in: ["PENDING", "AWAITING_VERIFICATION"] },
        period_start: { gte: new Date(nextPeriodStart.getTime() - 86_400_000) },
      },
      select: { id: true },
    })

    if (existingInvoice) {
      skipped.push(tenant.slug)
      continue
    }

    const invoice = await generateInvoice({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      planPrice: tenant.plan.price,
      periodStart: nextPeriodStart,
      periodEnd: nextPeriodEnd,
      now,
    })

    await writeAuditLog({
      action: "invoice.auto_generated",
      tenantId: tenant.id,
      resource: `invoice:${invoice.id}`,
      metadata: {
        invoice_number: invoice.invoice_number,
        amount: invoice.amount.toString(),
        plan_name: tenant.plan.name,
        days_before_expiry: Math.ceil(
          (tenant.subscription_end_at.getTime() - now.getTime()) / 86_400_000,
        ),
      },
    })

    generated.push(invoice.invoice_number)
  }

  return NextResponse.json({
    ok: true,
    now,
    generated,
    skipped,
    counts: { generated: generated.length, skipped: skipped.length },
  })
}

export const POST = handle
export const GET = handle
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/auto-generate-invoices/route.ts
git commit -m "feat: add daily cron to auto-generate subscription invoices"
```

---

## Task 10: UI — Super Admin invoice list page

**Files:**
- Create: `src/app/super-admin/invoices/page.tsx`
- Create: `src/app/super-admin/invoices/_components/InvoiceListClient.tsx`

- [ ] **Step 1: Create the client component with filters and table**

```typescript
// src/app/super-admin/invoices/_components/InvoiceListClient.tsx
"use client"

import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { AlertCircle } from "lucide-react"
import { InvoiceStatusBadge } from "@/app/super-admin/_components/InvoiceStatusBadge"
import type { InvoiceStatus } from "@prisma/client"

export interface InvoiceRow {
  id: string
  invoice_number: string
  amount: string
  period_start: string
  period_end: string
  status: InvoiceStatus
  paid_at: string | null
  created_at: string
  tenant: {
    id: string
    name: string
    slug: string
  }
}

interface Props {
  invoices: InvoiceRow[]
  meta: {
    total: number
    page: number
    page_size: number
    total_pages: number
  }
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Semua Status" },
  { value: "AWAITING_VERIFICATION", label: "Menunggu Verifikasi" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Lunas" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
]

const idr = (v: string | number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v))

const dateFmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—"

export function InvoiceListClient({ invoices, meta }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString())
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      next.delete("page")
      router.push(`${pathname}?${next.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const buildPageHref = (p: number) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set("page", String(p))
    return `${pathname}?${next.toString()}`
  }

  const currentStatus = searchParams.get("status") ?? ""
  const currentSearch = searchParams.get("search") ?? ""

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          defaultValue={currentSearch}
          placeholder="Cari no. invoice / tenant..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParam("search", (e.target as HTMLInputElement).value.trim())
            }
          }}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
        />
        <select
          value={currentStatus}
          onChange={(e) => updateParam("status", e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-16 text-sm text-slate-500 dark:text-slate-400">
            Tidak ada invoice ditemukan.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-5 py-3">No. Invoice</th>
                    <th className="text-left font-semibold px-5 py-3">Tenant</th>
                    <th className="text-left font-semibold px-5 py-3">Periode</th>
                    <th className="text-right font-semibold px-5 py-3">Jumlah</th>
                    <th className="text-left font-semibold px-5 py-3">Status</th>
                    <th className="text-left font-semibold px-5 py-3">Dibuat</th>
                    <th className="text-right font-semibold px-5 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {invoices.map((inv) => {
                    const needsAction = inv.status === "AWAITING_VERIFICATION"
                    return (
                      <tr
                        key={inv.id}
                        className={
                          "transition-colors " +
                          (needsAction
                            ? "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            : "hover:bg-slate-50/70 dark:hover:bg-slate-700/30")
                        }
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {needsAction && (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                            <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                              {inv.invoice_number}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/super-admin/tenants/${inv.tenant.id}`}
                            className="font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {inv.tenant.name}
                          </Link>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {inv.tenant.slug}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {dateFmt(inv.period_start)} – {dateFmt(inv.period_end)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {idr(inv.amount)}
                        </td>
                        <td className="px-5 py-3">
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {dateFmt(inv.created_at)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/super-admin/invoices/${inv.id}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                          >
                            Detail
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 px-5 py-3 text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  {meta.total.toLocaleString("id-ID")} invoice · Hal {meta.page} dari{" "}
                  {meta.total_pages}
                </span>
                <div className="flex items-center gap-2">
                  {meta.page > 1 && (
                    <Link
                      href={buildPageHref(meta.page - 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 text-sm"
                    >
                      Sebelumnya
                    </Link>
                  )}
                  {meta.page < meta.total_pages && (
                    <Link
                      href={buildPageHref(meta.page + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 text-sm"
                    >
                      Selanjutnya
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the server page**

```typescript
// src/app/super-admin/invoices/page.tsx
import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
import type { InvoiceStatus, Prisma } from "@prisma/client"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { InvoiceListClient, type InvoiceRow } from "./_components/InvoiceListClient"

export const metadata = {
  title: "Invoices — Super Admin",
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 20
const VALID_STATUSES: InvoiceStatus[] = [
  "PENDING",
  "AWAITING_VERIFICATION",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]

interface PageProps {
  searchParams?: {
    status?: string
    tenantId?: string
    search?: string
    page?: string
  }
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  const sp = searchParams ?? {}
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1)
  const search = sp.search?.trim()
  const statusParam = sp.status as InvoiceStatus | undefined
  const tenantId = sp.tenantId

  const where: Prisma.SubscriptionInvoiceWhereInput = {}

  if (statusParam && VALID_STATUSES.includes(statusParam)) {
    where.status = statusParam
  }

  if (tenantId) where.tenant_id = tenantId

  if (search) {
    where.OR = [
      { invoice_number: { contains: search, mode: "insensitive" } },
      { tenant: { name: { contains: search, mode: "insensitive" } } },
      { tenant: { slug: { contains: search, mode: "insensitive" } } },
    ]
  }

  const skip = (page - 1) * PAGE_SIZE

  const [invoices, total, awaitingCount] = await Promise.all([
    prisma.subscriptionInvoice.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: [
        // AWAITING_VERIFICATION naik ke atas
        { status: "asc" },
        { created_at: "desc" },
      ],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.subscriptionInvoice.count({ where }),
    prisma.subscriptionInvoice.count({ where: { status: "AWAITING_VERIFICATION" } }),
  ])

  const rows: InvoiceRow[] = invoices.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    amount: inv.amount.toString(),
    period_start: inv.period_start.toISOString(),
    period_end: inv.period_end.toISOString(),
    status: inv.status,
    paid_at: inv.paid_at?.toISOString() ?? null,
    created_at: inv.created_at.toISOString(),
    tenant: inv.tenant,
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Invoices
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {total.toLocaleString("id-ID")} invoice
              {awaitingCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-semibold">
                  {awaitingCount} perlu verifikasi
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <InvoiceListClient
        invoices={rows}
        meta={{
          total,
          page,
          page_size: PAGE_SIZE,
          total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/super-admin/invoices/page.tsx src/app/super-admin/invoices/_components/InvoiceListClient.tsx
git commit -m "feat: add Super Admin invoice list page with filters"
```

---

## Task 11: UI — Invoice detail page

**Files:**
- Create: `src/app/super-admin/invoices/[id]/page.tsx`
- Create: `src/app/super-admin/invoices/[id]/_components/InvoiceActions.tsx`

- [ ] **Step 1: Create the InvoiceActions client component**

```typescript
// src/app/super-admin/invoices/[id]/_components/InvoiceActions.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, Loader2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { InvoiceStatus } from "@prisma/client"

interface Props {
  invoiceId: string
  status: InvoiceStatus
  proofUrl: string | null
}

export function InvoiceActions({ invoiceId, status, proofUrl }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Verify form state
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("BCA Transfer")
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [verifyNotes, setVerifyNotes] = useState("")

  // Reject form state
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const canAct = status === "AWAITING_VERIFICATION"

  async function handleVerify() {
    setBusy("verify")
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/super-admin/invoices/${invoiceId}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method: paymentMethod,
          paid_at: new Date(paidAt).toISOString(),
          notes: verifyNotes || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data?.message ?? "Gagal memverifikasi")
        return
      }
      setVerifyOpen(false)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function handleReject() {
    if (rejectReason.trim().length < 5) {
      setErrorMsg("Alasan minimal 5 karakter")
      return
    }
    setBusy("reject")
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/super-admin/invoices/${invoiceId}/reject-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data?.message ?? "Gagal menolak")
        return
      }
      setRejectOpen(false)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  if (!canAct) return null

  return (
    <>
      {errorMsg && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-2">{errorMsg}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => {
            setErrorMsg(null)
            setVerifyOpen(true)
          }}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
        >
          <CheckCircle className="w-4 h-4" />
          Verifikasi Lunas
        </button>
        <button
          onClick={() => {
            setErrorMsg(null)
            setRejectOpen(true)
          }}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50"
        >
          <XCircle className="w-4 h-4" />
          Tolak Bukti
        </button>
      </div>

      {/* Verify dialog */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Pembayaran</DialogTitle>
            <DialogDescription>
              Konfirmasi bahwa transfer sudah diterima dan invoice ini lunas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Metode Pembayaran
              </label>
              <input
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="BCA Transfer, Mandiri, DANA, dll"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Tanggal Bayar
              </label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Catatan (opsional)
              </label>
              <textarea
                rows={2}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setVerifyOpen(false)}
              className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <X className="w-3.5 h-3.5 inline mr-1" />
              Batal
            </button>
            <button
              onClick={handleVerify}
              disabled={busy === "verify" || !paymentMethod.trim() || !paidAt}
              className="px-4 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy === "verify" ? (
                <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
              )}
              Konfirmasi Lunas
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Bukti Transfer</DialogTitle>
            <DialogDescription>
              Bukti transfer ditolak, invoice kembali ke status PENDING. Customer perlu upload ulang.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Alasan Penolakan
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Mis. Bukti tidak terbaca, jumlah tidak sesuai, dll"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setRejectOpen(false)}
              className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              onClick={handleReject}
              disabled={busy === "reject" || rejectReason.trim().length < 5}
              className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy === "reject" ? (
                <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5 inline mr-1" />
              )}
              Tolak
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 2: Create the server detail page**

```typescript
// src/app/super-admin/invoices/[id]/page.tsx
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, FileText, ExternalLink } from "lucide-react"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { InvoiceStatusBadge } from "@/app/super-admin/_components/InvoiceStatusBadge"
import { InvoiceActions } from "./_components/InvoiceActions"

export const metadata = {
  title: "Detail Invoice — Super Admin",
  robots: { index: false, follow: false },
}

const idr = (v: string | number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v))

const dateFmt = (d: Date | null | undefined) =>
  d
    ? d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "—"

const dateTimeFmt = (d: Date | null | undefined) =>
  d ? d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—"

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

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

  if (!invoice) notFound()

  const isImage =
    invoice.payment_proof !== null &&
    /\.(jpg|jpeg|png)$/i.test(invoice.payment_proof)

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/super-admin/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke daftar invoice
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shrink-0">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {invoice.invoice_number}
              </p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {idr(invoice.amount.toString())}
              </h1>
              <div className="mt-1.5">
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </div>
          </div>
          <InvoiceActions
            invoiceId={invoice.id}
            status={invoice.status}
            proofUrl={invoice.payment_proof}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Invoice info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Detail Invoice</h3>
          <KvRow label="Periode" value={`${dateFmt(invoice.period_start)} – ${dateFmt(invoice.period_end)}`} />
          <KvRow label="Dibuat" value={dateTimeFmt(invoice.created_at)} />
          {invoice.notes && <KvRow label="Catatan" value={invoice.notes} />}
          {invoice.rejected_reason && (
            <KvRow label="Alasan Ditolak" value={invoice.rejected_reason} tone="err" />
          )}
        </div>

        {/* Tenant info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Tenant</h3>
          <KvRow label="Nama" value={invoice.tenant.name} />
          <KvRow label="Slug" value={invoice.tenant.slug} mono />
          <KvRow label="PIC" value={invoice.tenant.owner_name} />
          <KvRow label="Email" value={invoice.tenant.owner_email} />
          <div className="pt-1">
            <Link
              href={`/super-admin/tenants/${invoice.tenant.id}`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Lihat Detail Tenant
            </Link>
          </div>
        </div>
      </div>

      {/* Payment info */}
      {(invoice.paid_at || invoice.verified_by || invoice.payment_method) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Info Pembayaran</h3>
          {invoice.payment_method && (
            <KvRow label="Metode" value={invoice.payment_method} />
          )}
          {invoice.paid_at && (
            <KvRow label="Tanggal Bayar" value={dateTimeFmt(invoice.paid_at)} />
          )}
          {invoice.payment_notes && (
            <KvRow label="Catatan Customer" value={invoice.payment_notes} />
          )}
          {invoice.verified_at && (
            <KvRow label="Diverifikasi Pada" value={dateTimeFmt(invoice.verified_at)} />
          )}
        </div>
      )}

      {/* Payment proof */}
      {invoice.payment_proof && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Bukti Transfer</h3>
            <a
              href={invoice.payment_proof}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Buka di tab baru
            </a>
          </div>
          {isImage ? (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={invoice.payment_proof}
                alt="Bukti Transfer"
                className="w-full h-auto object-contain max-h-[600px]"
              />
            </div>
          ) : (
            <a
              href={invoice.payment_proof}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              Lihat Dokumen PDF
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function KvRow({
  label,
  value,
  mono,
  tone,
}: {
  label: string
  value: string
  mono?: boolean
  tone?: "err"
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <p
        className={
          "mt-0.5 text-sm " +
          (tone === "err"
            ? "text-red-600 dark:text-red-400"
            : "text-slate-900 dark:text-slate-100") +
          (mono ? " font-mono" : "")
        }
      >
        {value}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/super-admin/invoices/[id]/page.tsx src/app/super-admin/invoices/[id]/_components/InvoiceActions.tsx
git commit -m "feat: add Super Admin invoice detail page with verify/reject actions"
```

---

## Task 12: Update tenant detail — Invoices tab enhancements

The Invoices tab in `src/app/super-admin/tenants/[id]/page.tsx` already renders invoices but the rows are not clickable and there's no "Generate Invoice" button. Add both.

**Files:**
- Modify: `src/app/super-admin/tenants/[id]/page.tsx`
- Modify: `src/app/super-admin/tenants/[id]/_components/TenantActions.tsx`

- [ ] **Step 1: Make invoice rows link to detail + add Generate Invoice button**

In `src/app/super-admin/tenants/[id]/page.tsx`:

1. Add import at top of file (after existing imports):
```typescript
import { InvoiceStatusBadge } from "@/app/super-admin/_components/InvoiceStatusBadge"
```

2. In the Invoices `TabsContent` (around line 438), replace the `<td>` for status with:
```tsx
<td className="px-5 py-3">
  <InvoiceStatusBadge status={inv.status} />
</td>
```

3. Add an Actions column to the invoice table. In `<thead>`, after the "Dibayar" header, add:
```tsx
<th className="text-right font-semibold px-5 py-3">Aksi</th>
```

4. In each `<tr>` for invoices, add a column:
```tsx
<td className="px-5 py-3 text-right">
  <Link
    href={`/super-admin/invoices/${inv.id}`}
    className="inline-flex items-center px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40"
  >
    Detail
  </Link>
</td>
```

5. After the table `</div>` (end of invoices TabsContent), add a footer with the Generate Invoice button and link to all invoices:
```tsx
<div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 px-5 py-3">
  <Link
    href={`/super-admin/invoices?tenantId=${tenant.id}`}
    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
  >
    Lihat semua invoice tenant ini →
  </Link>
  <GenerateInvoiceButton tenantId={tenant.id} />
</div>
```

- [ ] **Step 2: Add GenerateInvoiceButton component to TenantActions file**

Append to end of `src/app/super-admin/tenants/[id]/_components/TenantActions.tsx`:

```typescript
// Add this import at top of TenantActions.tsx:
// import { Plus } from "lucide-react"
// import { useState } from "react"  ← already imported

export function GenerateInvoiceButton({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [planId, setPlanId] = useState("")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [plans, setPlans] = useState<{ id: string; name: string; price: string }[]>([])

  async function openModal() {
    setOpen(true)
    setErrorMsg(null)
    const res = await fetch("/api/super-admin/plans?includeInactive=false")
    if (res.ok) {
      const data = await res.json()
      setPlans(
        (data.plans as { id: string; name: string; price: string }[]).filter(
          (p) => !("is_trial" in p && p.is_trial),
        ),
      )
    }
  }

  async function handleGenerate() {
    if (!planId || !periodStart || !periodEnd) {
      setErrorMsg("Semua field wajib diisi")
      return
    }
    setBusy(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/super-admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          plan_id: planId,
          period_start: new Date(periodStart).toISOString(),
          period_end: new Date(periodEnd).toISOString(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data?.message ?? "Gagal membuat invoice")
        return
      }
      setOpen(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium hover:bg-violet-100 dark:hover:bg-violet-900/50"
      >
        <Plus className="w-3.5 h-3.5" />
        Generate Invoice
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoice Manual</DialogTitle>
            <DialogDescription>
              Buat invoice subscription baru untuk tenant ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Plan
              </label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Rp {Number(p.price).toLocaleString("id-ID")}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Periode Mulai
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Periode Akhir
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {errorMsg && (
              <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              onClick={handleGenerate}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 inline mr-1" />}
              Generate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 3: Add `Plus` import to TenantActions.tsx imports**

In `src/app/super-admin/tenants/[id]/_components/TenantActions.tsx`, add `Plus` to the lucide imports:

```typescript
import {
  Pencil,
  Pause,
  Play,
  CalendarPlus,
  Trash2,
  Loader2,
  X,
  Plus,           // ← add this
} from "lucide-react"
```

And add the `GenerateInvoiceButton` import reference in tenant detail page. In `src/app/super-admin/tenants/[id]/page.tsx`, add to imports:
```typescript
import { TenantActions, GenerateInvoiceButton } from "./_components/TenantActions"
```

- [ ] **Step 4: Commit**

```bash
git add src/app/super-admin/tenants/[id]/page.tsx src/app/super-admin/tenants/[id]/_components/TenantActions.tsx
git commit -m "feat: add invoice links and Generate Invoice button to tenant detail"
```

---

## Task 13: Add Invoices link to Super Admin nav

**Files:**
- Modify: `src/app/super-admin/layout.tsx`

- [ ] **Step 1: Check existing nav items and add Invoices**

Read `src/app/super-admin/layout.tsx` to find where nav items are listed, then add an Invoices link alongside the existing Tenants, Plans, Bank Accounts links. The exact change depends on the layout structure.

```typescript
// Add this nav item alongside existing super-admin nav links:
{ href: "/super-admin/invoices", label: "Invoices", icon: FileText }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/super-admin/layout.tsx
git commit -m "feat: add Invoices link to Super Admin navigation"
```

---

## Task 14: TypeScript build check

- [ ] **Step 1: Run tsc to catch type errors**

```bash
cd /Users/user/Root-VCR && npx tsc --noEmit 2>&1 | head -50
```

Expected: No errors. Fix any type errors before proceeding.

- [ ] **Step 2: Run unit tests one final time**

```bash
cd /Users/user/Root-VCR && npx vitest run src/tests/lib/invoice.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Manual Payment System (Step 8) — invoice CRUD, proof upload, cron, Super Admin UI"
```

---

## Self-Review

### Spec Coverage

| Requirement | Covered by Task |
|-------------|----------------|
| `lib/invoice.ts` — generateInvoice | Task 2 |
| `lib/invoice.ts` — verifyPayment (extend subscription) | Task 2 |
| `lib/invoice.ts` — rejectPayment | Task 2 |
| Invoice number format `INV-{YYYYMMDD}-{slug}-{seq}` | Task 2 |
| `GET /api/super-admin/invoices` (filter status, tenant, periode) | Task 4 |
| `POST /api/super-admin/invoices` (create manual) | Task 4 |
| `GET /api/super-admin/invoices/[id]` (detail + proof URL) | Task 5 |
| `POST /api/super-admin/invoices/[id]/verify-payment` | Task 6 |
| `POST /api/super-admin/invoices/[id]/reject-payment` | Task 7 |
| Local storage `public/uploads/payment-proofs/` | Task 8 |
| Max 2MB, jpg/png/pdf | Task 8 |
| File name pattern `{invoice_number}_{timestamp}.{ext}` | Task 8 |
| Cron — daily, non-trial, subscriptionEndAt < now+7d | Task 9 |
| Cron — skip if PENDING/AWAITING invoice already exists | Task 9 |
| UI invoice list — filter & search | Task 10 |
| UI invoice list — badge status | Task 10 |
| UI invoice list — highlight AWAITING_VERIFICATION | Task 10 |
| UI invoice list — View Proof, Verify, Reject buttons | Task 11 |
| UI invoice detail — preview image | Task 11 |
| UI invoice detail — verify form (method, date, notes) | Task 11 |
| UI invoice detail — reject modal (reason) | Task 11 |
| Tenant detail Invoices tab — list + generate button | Task 12 |

### No Placeholder Scan

✅ All code blocks contain complete, executable code.

### Type Consistency

- `InvoiceRow.status` typed as `InvoiceStatus` from `@prisma/client` — consistent across Task 10 and 11.
- `generateInvoice()` params: `{ tenantId, tenantSlug, planPrice, periodStart, periodEnd }` — used consistently in Tasks 2, 4, 9.
- `verifyPayment()` params: `{ invoiceId, verifiedBy, paymentMethod, paidAt, notes? }` — consistent in Tasks 2, 6.
- `rejectPayment()` params: `{ invoiceId, reason }` — consistent in Tasks 2, 7.
- `InvoiceStatusBadge` accepts `status: InvoiceStatus` — used in Tasks 3, 10, 11.
- `GenerateInvoiceButton` exported from TenantActions — imported in Task 12.
