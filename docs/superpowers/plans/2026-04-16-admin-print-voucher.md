# Admin Print Voucher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin dapat cetak voucher tanpa potong saldo dan tanpa masuk laporan keuangan, tanpa mengubah flow reseller.

**Architecture:** Tambah enum `VoucherSource` (ADMIN/RESELLER) + field `source` ke tabel `vouchers` dengan default `RESELLER`. API `/api/vouchers/generate` sudah ada role guard — cukup tambah set `source` dan `price_charged=0` untuk admin. Semua revenue queries difilter `source: 'RESELLER'`. UI baru `AdminPrintVoucherForm` di admin dashboard.

**Tech Stack:** Next.js 14 App Router, Prisma ORM, PostgreSQL, TypeScript, Tailwind CSS, shadcn/ui

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add `VoucherSource` enum + `source` field to Voucher |
| `src/app/api/vouchers/generate/route.ts` | Modify | Set `source` + `price_charged=0` for admin |
| `src/app/(dashboard)/admin/dashboard/AdminPrintVoucherForm.tsx` | **Create** | Client form component untuk admin cetak voucher |
| `src/app/(dashboard)/admin/dashboard/page.tsx` | Modify | Filter revenue queries + fetch profiles + render form |
| `src/app/(dashboard)/admin/analytics/page.tsx` | Modify | Filter `revenueMTD` + `vouchersLast7Days` by source |
| `src/app/(dashboard)/admin/revenue/page.tsx` | Modify | Filter voucher query by `source: 'RESELLER'` |

---

## Task 1: Prisma Schema — Add VoucherSource

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enum and field to schema**

Open `prisma/schema.prisma`. Add the enum BEFORE the `model Voucher` block, and add the `source` field inside the model.

Current enum section (line ~19):
```prisma
enum VoucherStatus {
  unused
  active
  inactive
  expired
  deleted
}
```

Add new enum after `VoucherStatus`:
```prisma
enum VoucherSource {
  ADMIN
  RESELLER
}
```

Then in `model Voucher`, add `source` field after `mikrotik_synced`:
```prisma
model Voucher {
  id              String        @id @default(uuid())
  code            String        @unique @db.VarChar(50)
  user_id         String?
  profile_id      String?
  status          VoucherStatus @default(unused)
  price_charged   Decimal       @db.Decimal(12, 2)
  generated_at    DateTime      @default(now())
  used_at         DateTime?
  expired_at      DateTime?
  client_ip       String?       @db.VarChar(45)
  client_mac      String?       @db.VarChar(17)
  mikrotik_synced Boolean       @default(false)
  source          VoucherSource @default(RESELLER)
  created_at      DateTime      @default(now())

  user    User?    @relation(fields: [user_id], references: [id])
  profile Profile? @relation(fields: [profile_id], references: [id])

  @@map("vouchers")
}
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/user/Root-VCR
npx prisma migrate dev --name add_voucher_source
```

Expected output:
```
Applying migration `<timestamp>_add_voucher_source`
The following migration(s) have been applied:
migrations/
  └─ <timestamp>_add_voucher_source/
    └─ migration.sql
```

- [ ] **Step 3: Verify Prisma client generated**

```bash
npx prisma generate
```

Expected output: `Generated Prisma Client ...`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add VoucherSource enum and source field to vouchers"
```

---

## Task 2: API — Set source and price_charged for Admin

**Files:**
- Modify: `src/app/api/vouchers/generate/route.ts`

The role values from `requireAuth()` are lowercase strings matching the Prisma `Role` enum: `"admin"` and `"reseller"`. The `VoucherSource` enum values are `"ADMIN"` and `"RESELLER"`.

- [ ] **Step 1: Update `priceCharged` calculation**

Find this block (around line 112):
```typescript
  // Hitung harga per voucher
  let priceCharged = basePrice
  let feePercentage = 0
  if (user.role === "reseller") {
```

Change `let priceCharged = basePrice` to:
```typescript
  // Hitung harga per voucher
  // Admin: gratis (price_charged = 0, tidak potong wallet)
  let priceCharged = user.role === "admin" ? 0 : basePrice
  let feePercentage = 0
  if (user.role === "reseller") {
```

- [ ] **Step 2: Add `source` field to voucher create**

Find the `tx.voucher.create` call inside `prisma.$transaction` (around line 129):
```typescript
        tx.voucher.create({
          data: {
            code,
            user_id: user.id,
            profile_id: profileId,
            status: "unused",
            price_charged: priceCharged,
          },
```

Change to:
```typescript
        tx.voucher.create({
          data: {
            code,
            user_id: user.id,
            profile_id: profileId,
            status: "unused",
            price_charged: priceCharged,
            source: user.role === "admin" ? "ADMIN" : "RESELLER",
          },
```

- [ ] **Step 3: Verify build compiles**

```bash
cd /Users/user/Root-VCR
npx tsc --noEmit 2>&1 | head -30
```

Expected: no output (no errors). If errors appear, they will name the file and line.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/vouchers/generate/route.ts
git commit -m "feat: set source=ADMIN and price_charged=0 for admin voucher generation"
```

---

## Task 3: Filter Revenue Queries — Dashboard

**Files:**
- Modify: `src/app/(dashboard)/admin/dashboard/page.tsx`

There are two financial queries to filter: `revenueMTD` and `vouchersLast7Days`. The `vouchersToday` count is operational (not financial) — leave it unfiltered.

- [ ] **Step 1: Filter `revenueMTD` query**

Find (around line 34):
```typescript
    prisma.voucher.aggregate({
      where: { generated_at: { gte: startOfMonth } },
      _sum: { price_charged: true }
    }),
```

Change to:
```typescript
    prisma.voucher.aggregate({
      where: { generated_at: { gte: startOfMonth }, source: "RESELLER" },
      _sum: { price_charged: true }
    }),
```

- [ ] **Step 2: Filter `vouchersLast7Days` query**

Find (around line 60):
```typescript
  const vouchersLast7Days = await prisma.voucher.findMany({
    where: { generated_at: { gte: sevenDaysAgo } },
    select: { generated_at: true, price_charged: true }
  })
```

Change to:
```typescript
  const vouchersLast7Days = await prisma.voucher.findMany({
    where: { generated_at: { gte: sevenDaysAgo }, source: "RESELLER" },
    select: { generated_at: true, price_charged: true }
  })
```

- [ ] **Step 3: Add `activeProfiles` fetch for form (add to the existing `Promise.all` or after it)**

After the `Promise.all` block that fetches `[vouchersToday, totalResellerSaldo, revenueMTD, activeResellers, recentWallets]`, add:

```typescript
  const activeProfiles = await prisma.profile.findMany({
    where: { is_active: true },
    orderBy: { price: "asc" },
    select: { id: true, name: true, duration_days: true, duration_hours: true },
  })
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no output.

- [ ] **Step 5: Commit (partial — UI wiring comes in Task 5)**

```bash
git add src/app/(dashboard)/admin/dashboard/page.tsx
git commit -m "feat: filter revenue queries to RESELLER source only + fetch active profiles"
```

---

## Task 4: Filter Revenue Queries — Analytics & Revenue Pages

**Files:**
- Modify: `src/app/(dashboard)/admin/analytics/page.tsx`
- Modify: `src/app/(dashboard)/admin/revenue/page.tsx`

- [ ] **Step 1: Filter `revenueMTD` in analytics page**

In `src/app/(dashboard)/admin/analytics/page.tsx`, find (around line 45):
```typescript
    prisma.voucher.aggregate({
      where: { generated_at: { gte: startOfMonth } },
      _sum: { price_charged: true },
    }),
```

Change to:
```typescript
    prisma.voucher.aggregate({
      where: { generated_at: { gte: startOfMonth }, source: "RESELLER" },
      _sum: { price_charged: true },
    }),
```

- [ ] **Step 2: Filter `vouchersLast7Days` in analytics page**

In the same file, find (around line 51):
```typescript
    prisma.voucher.findMany({
      where: { generated_at: { gte: sevenDaysAgo } },
      select: { generated_at: true, price_charged: true, profile: { select: { name: true } } },
    }),
```

Change to:
```typescript
    prisma.voucher.findMany({
      where: { generated_at: { gte: sevenDaysAgo }, source: "RESELLER" },
      select: { generated_at: true, price_charged: true, profile: { select: { name: true } } },
    }),
```

- [ ] **Step 3: Filter vouchers in revenue page**

In `src/app/(dashboard)/admin/revenue/page.tsx`, find (around line 28):
```typescript
  const vouchers = await prisma.voucher.findMany({
    where: { generated_at: { gte: startOfMonth, lte: endOfMonth } },
    select: { generated_at: true, price_charged: true },
  })
```

Change to:
```typescript
  const vouchers = await prisma.voucher.findMany({
    where: { generated_at: { gte: startOfMonth, lte: endOfMonth }, source: "RESELLER" },
    select: { generated_at: true, price_charged: true },
  })
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/admin/analytics/page.tsx src/app/(dashboard)/admin/revenue/page.tsx
git commit -m "feat: exclude admin-generated vouchers from analytics and revenue reports"
```

---

## Task 5: Create AdminPrintVoucherForm Component

**Files:**
- Create: `src/app/(dashboard)/admin/dashboard/AdminPrintVoucherForm.tsx`

This is a client component. It calls the same `/api/vouchers/generate` endpoint and reuses `VoucherSuccessModal`. No balance info is shown.

- [ ] **Step 1: Create the component file**

Create `src/app/(dashboard)/admin/dashboard/AdminPrintVoucherForm.tsx` with the following content:

```typescript
"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2, Printer, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { VoucherSuccessModal, VoucherGeneratedData } from "@/components/modals/VoucherSuccessModal"
import { cn } from "@/lib/utils"

interface Profile {
  id: string
  name: string
  duration_days: number
  duration_hours: number
}

interface AdminPrintVoucherFormProps {
  profiles: Profile[]
}

export function AdminPrintVoucherForm({ profiles }: AdminPrintVoucherFormProps) {
  const router = useRouter()
  const [profileId, setProfileId] = useState<string>(profiles[0]?.id ?? "")
  const [quantity, setQuantity] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [generatedVouchers, setGeneratedVouchers] = useState<VoucherGeneratedData[]>([])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId || quantity < 1) return

    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/vouchers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, quantity }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || data.error || "Gagal generate voucher")
      }

      const vouchersForModal: VoucherGeneratedData[] = data.vouchers.map(
        (v: { code: string; profile: { name: string; duration_days: number } }) => ({
          code: v.code,
          profileName: v.profile.name,
          durationDays: v.profile.duration_days * 24,
        })
      )

      setGeneratedVouchers(vouchersForModal)
      setModalOpen(true)
      setQuantity(1)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga.")
    } finally {
      setLoading(false)
    }
  }

  if (profiles.length === 0) {
    return (
      <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-4 rounded-xl border border-orange-100 dark:border-orange-800/50 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm">Belum ada profile aktif. Tambahkan profile di halaman Vouchers.</p>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleGenerate} className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-100 dark:border-red-800/50 flex gap-2 items-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Pilih Profile
            </label>
            <div className="relative">
              <select
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                className="w-full appearance-none bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                disabled={loading}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.duration_days > 0 ? ` — ${p.duration_days} Hari` : ""}{p.duration_hours > 0 ? ` ${p.duration_hours} Jam` : ""}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Jumlah Voucher
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all",
            "bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-0.5",
            "disabled:opacity-60 disabled:pointer-events-none disabled:transform-none"
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Printer className="w-5 h-5" />
              CETAK VOUCHER
            </>
          )}
        </button>
      </form>

      <VoucherSuccessModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vouchers={generatedVouchers}
      />
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/dashboard/AdminPrintVoucherForm.tsx
git commit -m "feat: add AdminPrintVoucherForm component for admin voucher printing"
```

---

## Task 6: Wire AdminPrintVoucherForm into Admin Dashboard

**Files:**
- Modify: `src/app/(dashboard)/admin/dashboard/page.tsx`

Task 3 already added the `activeProfiles` fetch. Now add the import and JSX section.

- [ ] **Step 1: Add import at top of file**

Add this import after the existing imports in `src/app/(dashboard)/admin/dashboard/page.tsx`:

```typescript
import { AdminPrintVoucherForm } from "./AdminPrintVoucherForm"
```

- [ ] **Step 2: Add Cetak Voucher section to JSX**

Find the closing `</div>` of the main container (the outermost `<div className="max-w-7xl mx-auto space-y-6 ...">`) at the bottom of the return block, just before it closes. Add the new section after the existing `<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">` block:

```tsx
      {/* Cetak Voucher — Admin Only */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 max-w-md">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Cetak Voucher</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Generate voucher tanpa potong saldo — tidak masuk laporan keuangan.
        </p>
        <AdminPrintVoucherForm profiles={activeProfiles} />
      </div>
```

The full return block structure becomes:
```
<div className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-0 animate-slide-up">
  {/* Title */}
  {/* Stats grid */}
  {/* Revenue chart + Top Resellers grid */}
  {/* Cetak Voucher — NEW */}
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/admin/dashboard/page.tsx
git commit -m "feat: add Cetak Voucher section to admin dashboard"
```

---

## Task 7: Verify End-to-End Manually

This project uses Next.js. Start the dev server and verify each item in the testing checklist.

- [ ] **Step 1: Start dev server**

```bash
cd /Users/user/Root-VCR
npm run dev
```

Open browser to `http://localhost:3000`

- [ ] **Step 2: Test admin generate flow**

1. Login as admin
2. Go to `/admin/dashboard`
3. Scroll down — confirm "Cetak Voucher" section is visible
4. Select a profile, set quantity to 1, click "CETAK VOUCHER"
5. Confirm `VoucherSuccessModal` appears with a voucher code
6. Confirm no error in browser console

- [ ] **Step 3: Verify database records via Prisma Studio or direct check**

```bash
npx prisma studio
```

Or check via DB:
```sql
SELECT code, price_charged, source FROM vouchers ORDER BY generated_at DESC LIMIT 5;
```

Expected for last admin-generated voucher:
- `price_charged = 0`
- `source = 'ADMIN'`

- [ ] **Step 4: Verify no WalletLog created for admin**

```sql
SELECT * FROM wallet_logs ORDER BY created_at DESC LIMIT 5;
```

Expected: no new record after admin generate.

- [ ] **Step 5: Verify revenue reports exclude admin vouchers**

1. Go to `/admin/dashboard` — Revenue (Bulan Ini) should NOT include admin vouchers
2. Go to `/admin/analytics` — Revenue stats should NOT include admin vouchers
3. Go to `/admin/revenue` — Revenue harian should NOT include admin vouchers

- [ ] **Step 6: Verify reseller flow unchanged**

1. Login as reseller
2. Go to `/reseller/dashboard`
3. Generate a voucher — saldo harus terpotong dan WalletLog harus ada
4. Confirm `source = 'RESELLER'` in DB for reseller voucher

- [ ] **Step 7: Final commit if all checks pass**

```bash
git add -A
git status  # Verify only expected files are staged
git commit -m "chore: verified admin print voucher feature end-to-end"
```

---

## Self-Review

**Spec coverage check:**

| Spec Requirement | Task |
|--|--|
| Role dari server-side auth | Task 2 — `user.role` dari `requireAuth()` |
| Admin: price_charged=0 | Task 2 Step 1 |
| Admin: source=ADMIN | Task 2 Step 2 |
| Admin: skip wallet deduction | Already in existing route — no change needed |
| Admin: skip wallet log | Already in existing route — no change needed |
| Admin: skip saldo validation | Already in existing route — no change needed |
| Reseller flow unchanged | No changes to reseller branch of logic |
| DB: VoucherSource enum | Task 1 |
| DB: source field default RESELLER | Task 1 |
| Revenue dashboard filter | Task 3 |
| Revenue analytics filter | Task 4 |
| Revenue page filter | Task 4 |
| AdminPrintVoucherForm | Task 5 |
| No saldo info in admin UI | Task 5 — no balance props |
| VoucherSuccessModal reused | Task 5 |
| Responsive UI | Task 5 — full-width form, max-w-md card |
| Dashboard section placement | Task 6 |
| MikroTik sync unaffected | source field not touched in sync logic |

**Placeholder scan:** None found.

**Type consistency:**
- `Profile` interface in `AdminPrintVoucherForm` matches what `activeProfiles` query selects (`id, name, duration_days, duration_hours`)
- `VoucherGeneratedData` imported from existing `VoucherSuccessModal` — no new type defined
- `source: "ADMIN" | "RESELLER"` matches Prisma `VoucherSource` enum values
