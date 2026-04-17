# Password Display + Prefix + Live Preview Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store voucher passwords in the DB at generate time, add a configurable password prefix, and display username + password accurately in Detail Voucher and Live Preview for both admin and reseller.

**Architecture:** Add nullable `password` column to `Voucher` table via Prisma migration. Generate route loads a new `voucher_password_prefix` setting and stores the final password (prefix + random or code when username=password) into the DB. The admin and reseller server pages pass this field through their serialisation maps into `VoucherDetailModal`, which resolves the display using a simple helper. `VoucherSettingsForm` gains a password prefix input and an updated live preview showing both USERNAME and PASSWORD rows.

**Tech Stack:** Next.js 14 App Router, Prisma ORM, TypeScript, Tailwind CSS

---

## File Map

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `password String? @db.VarChar(60)` to model Voucher |
| `src/app/api/vouchers/generate/route.ts` | Load prefix setting, apply prefix, store password in DB |
| `src/app/(dashboard)/admin/voucher-settings/page.tsx` | Add `voucher_password_prefix` to settings query + initial |
| `src/app/(dashboard)/admin/voucher-settings/VoucherSettingsForm.tsx` | Prefix field, previewPassword state, updated live preview, save |
| `src/components/modals/VoucherDetailModal.tsx` | Add `password` to VoucherDetail interface + display logic |
| `src/app/(dashboard)/admin/vouchers/page.tsx` | Add `password` to `mappedVouchers` serialisation |
| `src/app/(dashboard)/admin/vouchers/VoucherAdminTabs.tsx` | Add `password` to local Voucher interface + openDetail mapping |
| `src/app/(dashboard)/reseller/vouchers/page.tsx` | Add `password` to `serializedVouchers` serialisation |
| `src/app/(dashboard)/reseller/vouchers/VouchersClient.tsx` | Add `password` to SerializedVoucher type + handleRowClick |

---

## Task 1: Prisma — add password column

**Files:**
- Modify: `prisma/schema.prisma:93-113`

- [ ] **Step 1: Add field inside model Voucher**

Open `prisma/schema.prisma`. Inside `model Voucher { ... }`, add the `password` line directly after `code`:

```prisma
model Voucher {
  id              String        @id @default(uuid())
  code            String        @unique @db.VarChar(50)
  password        String?       @db.VarChar(60)
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
  source          VoucherSource @default(reseller)
  created_at      DateTime      @default(now())

  user    User?    @relation(fields: [user_id], references: [id])
  profile Profile? @relation(fields: [profile_id], references: [id])

  @@map("vouchers")
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_voucher_password
```

Expected output (last line): `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify the Prisma client was regenerated**

```bash
grep "password" node_modules/.prisma/client/index.d.ts | grep -i "voucher" | head -3
```

Expected: at least one line containing `password?: string | null`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add password column to vouchers table"
```

---

## Task 2: Generate route — apply prefix and store password

**Files:**
- Modify: `src/app/api/vouchers/generate/route.ts`

- [ ] **Step 1: Add voucher_password_prefix to settings query**

At line 79-81, change the `in: [...]` array:

```ts
const settings = await prisma.setting.findMany({
  where: {
    key: {
      in: [
        "voucher_prefix",
        "voucher_code_length",
        "voucher_code_format",
        "voucher_username_equals_password",
        "voucher_password_prefix",
      ],
    },
  },
})
```

- [ ] **Step 2: Read the new setting**

After line 89 (`const usernameEqualsPassword = ...`), add:

```ts
const passwordPrefix = getSetting("voucher_password_prefix", "")
```

- [ ] **Step 3: Apply prefix in password generation**

Replace lines 106-108:

```ts
// BEFORE
const passwords: string[] = codes.map((code) =>
  usernameEqualsPassword ? code : generateRandomPassword(8)
)

// AFTER
const passwords: string[] = codes.map((code) =>
  usernameEqualsPassword ? code : passwordPrefix + generateRandomPassword(8)
)
```

- [ ] **Step 4: Store password in tx.voucher.create**

At line 134-154, change `codes.map((code) => {` to `codes.map((code, i) => {` and add `password: passwords[i]` to the data object:

```ts
const created = await Promise.all(
  codes.map((code, i) => {
    console.log("INSERT DB:", code)
    return tx.voucher.create({
      data: {
        code,
        password: passwords[i],
        user_id: user.id,
        profile_id: profileId,
        status: "unused",
        price_charged: priceCharged,
        source: user.role === "admin" ? "admin" : "reseller",
      },
      select: {
        id: true, code: true, status: true, price_charged: true,
        generated_at: true, mikrotik_synced: true,
        profile: { select: { name: true, duration_days: true, duration_hours: true } },
      },
    })
  })
)
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors in this file. (Other files may still have type errors — they are fixed in later tasks.)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/vouchers/generate/route.ts
git commit -m "feat: store password with optional prefix in generate route"
```

---

## Task 3: Settings page — load voucher_password_prefix

**Files:**
- Modify: `src/app/(dashboard)/admin/voucher-settings/page.tsx`

- [ ] **Step 1: Add key to settings query**

At line 23-34, add `"voucher_password_prefix"` to the `in: [...]` array:

```ts
const rows = await prisma.setting.findMany({
  where: {
    key: {
      in: [
        "voucher_prefix",
        "voucher_code_length",
        "voucher_code_format",
        "voucher_username_equals_password",
        "voucher_password_prefix",
      ],
    },
  },
})
```

- [ ] **Step 2: Add to initial object**

At line 39-44, add `voucher_password_prefix`:

```ts
const initial = {
  voucher_prefix:                   map.voucher_prefix ?? "",
  voucher_code_length:              parseInt(map.voucher_code_length ?? "8"),
  voucher_code_format:              toCodeFormat(map.voucher_code_format),
  voucher_username_equals_password: map.voucher_username_equals_password === "true",
  voucher_password_prefix:          map.voucher_password_prefix ?? "",
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/voucher-settings/page.tsx
git commit -m "feat: load voucher_password_prefix in settings page"
```

---

## Task 4: VoucherSettingsForm — prefix field + live preview

**Files:**
- Modify: `src/app/(dashboard)/admin/voucher-settings/VoucherSettingsForm.tsx`

- [ ] **Step 1: Update imports**

At line 6, add `generateRandomPassword` to the utils import:

```ts
import { generateVoucherCode, generateRandomPassword } from "@/lib/utils"
```

- [ ] **Step 2: Update VoucherSettingsFormProps interface**

At line 11-18, add `voucher_password_prefix`:

```ts
interface VoucherSettingsFormProps {
  initial: {
    voucher_prefix: string
    voucher_code_length: number
    voucher_code_format: CodeFormat
    voucher_username_equals_password: boolean
    voucher_password_prefix: string
  }
}
```

- [ ] **Step 3: Add passwordPrefix and previewPassword state**

After `const [usernameEqualsPassword, setUsernameEqualsPassword]` (line 28-30), add:

```ts
const [passwordPrefix, setPasswordPrefix] = useState(initial.voucher_password_prefix)
const [previewPassword, setPreviewPassword] = useState(() => generateRandomPassword(8))
```

- [ ] **Step 4: Add password prefix change handler**

After `handlePrefixChange` (line 45-48), add:

```ts
const handlePasswordPrefixChange = (v: string) => {
  const clean = v.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5)
  setPasswordPrefix(clean)
}
```

- [ ] **Step 5: Update refreshPreview to regenerate previewPassword too**

Replace the existing `refreshPreview` function (line 37-39):

```ts
const refreshPreview = useCallback(() => {
  setPreview(generatePreview(prefix, codeLength, format))
  setPreviewPassword(generateRandomPassword(8))
}, [prefix, codeLength, format])
```

- [ ] **Step 6: Add Password Prefix input field to Core Formatting card**

After the closing `</div>` of the Code Prefix field block (after line 128), add this block inside the same `<div className="p-5 space-y-6">`:

```tsx
{/* Password Prefix */}
<div>
  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
    Password Prefix <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">(maks 5 karakter, alfanumerik)</span>
  </label>
  <div className="relative">
    <input
      type="text"
      value={passwordPrefix}
      onChange={(e) => handlePasswordPrefixChange(e.target.value)}
      maxLength={5}
      placeholder="Contoh: PS"
      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 font-mono font-semibold tracking-widest uppercase text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
    />
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 font-medium">
      {passwordPrefix.length}/5
    </span>
  </div>
</div>
```

- [ ] **Step 7: Add voucher_password_prefix to save updates array**

In `handleSave` at line 59-64, add to the `updates` array:

```ts
updates: [
  { key: "voucher_prefix",                  value: prefix },
  { key: "voucher_code_length",              value: String(codeLength) },
  { key: "voucher_code_format",              value: format },
  { key: "voucher_username_equals_password", value: usernameEqualsPassword ? "true" : "false" },
  { key: "voucher_password_prefix",          value: passwordPrefix },
],
```

- [ ] **Step 8: Replace live preview code display box with username + password rows**

Replace the existing preview box (line 244-251):

```tsx
{/* BEFORE */}
<div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-center shadow-lg shadow-blue-500/20">
  <p className="text-xs font-semibold text-blue-100 uppercase tracking-widest mb-2">
    Kode Voucher
  </p>
  <p className="text-2xl font-black text-white tracking-widest font-mono break-all">
    {preview}
  </p>
</div>
```

Replace with:

```tsx
{/* AFTER */}
<div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 shadow-lg shadow-blue-500/20 space-y-3">
  <div className="text-center">
    <p className="text-xs font-semibold text-blue-100 uppercase tracking-widest mb-1">Username</p>
    <p className="text-xl font-black text-white tracking-widest font-mono break-all">{preview}</p>
  </div>
  <div className="border-t border-white/20 pt-3 text-center">
    <p className="text-xs font-semibold text-blue-100 uppercase tracking-widest mb-1">Password</p>
    <p className="text-xl font-black text-white tracking-widest font-mono break-all">
      {usernameEqualsPassword ? preview : (passwordPrefix + previewPassword) || previewPassword}
    </p>
  </div>
</div>
```

- [ ] **Step 9: Add Password Prefix row to config summary**

In the config summary section (line 271-281, the `Username = Password` row), add a new row immediately after the `Username = Password` row's closing `</div>`:

```tsx
{!usernameEqualsPassword && (
  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Password Prefix</span>
    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono">
      {passwordPrefix || <span className="text-slate-400 dark:text-slate-500 font-normal">—</span>}
    </span>
  </div>
)}
```

- [ ] **Step 10: TypeScript check — zero errors in this file**

```bash
npx tsc --noEmit 2>&1 | grep "VoucherSettingsForm"
```

Expected: no lines. (Other files may still error — handled in later tasks.)

- [ ] **Step 11: Commit**

```bash
git add src/app/(dashboard)/admin/voucher-settings/VoucherSettingsForm.tsx
git commit -m "feat: add password prefix field and updated live preview to settings form"
```

---

## Task 5: VoucherDetailModal — interface + password display

**Files:**
- Modify: `src/components/modals/VoucherDetailModal.tsx`

- [ ] **Step 1: Add password to VoucherDetail interface**

At line 7-19, add `password`:

```ts
export interface VoucherDetail {
  id: string
  code: string
  profile: string | null
  user_name: string | null
  generated_at: string
  used_at: string | null
  expired_at: string | null
  status: string
  client_ip: string | null
  client_mac: string | null
  price_charged: number
  password?: string | null
}
```

- [ ] **Step 2: Add resolvePasswordDisplay helper**

After the `formatDate` function (line ~48), add:

```ts
function resolvePasswordDisplay(password: string | null | undefined, code: string): string {
  if (password !== null && password !== undefined) {
    return password === code ? "sama dengan kode" : password
  }
  // old voucher: null password — username always equals code in this system
  return code
}
```

- [ ] **Step 3: Add PASSWORD row to detail view**

In the detail view, after the code display block (line ~219-222):

```tsx
<div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
  <span className="block text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Kode Voucher</span>
  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-widest">{voucher.code}</span>
</div>
```

Add this block directly below it:

```tsx
<div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
  <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">Password</span>
  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tracking-wider">
    {resolvePasswordDisplay(voucher.password, voucher.code)}
  </span>
</div>
```

- [ ] **Step 4: Add PASSWORD to card view**

In the card view grid (line ~181-209), add after the Reseller `<div>`:

```tsx
<div className="col-span-2">
  <span className="opacity-70 block mb-0.5">Password</span>
  <span className="font-semibold font-mono">
    {resolvePasswordDisplay(voucher.password, voucher.code)}
  </span>
</div>
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "VoucherDetailModal"
```

Expected: no lines.

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/VoucherDetailModal.tsx
git commit -m "feat: show password in VoucherDetailModal with old-voucher fallback"
```

---

## Task 6: Admin pipeline — page serialisation + VoucherAdminTabs

**Files:**
- Modify: `src/app/(dashboard)/admin/vouchers/page.tsx:68-80`
- Modify: `src/app/(dashboard)/admin/vouchers/VoucherAdminTabs.tsx:26-38,341-356`

- [ ] **Step 1: Add password to mappedVouchers in admin page**

At line 68-80 in `page.tsx`, add `password: v.password ?? null`:

```ts
const mappedVouchers = vouchers.map(v => ({
  id: v.id,
  code: v.code,
  profile_name: v.profile?.name ?? null,
  user_name: v.user?.name ?? null,
  status: v.status,
  generated_at: v.generated_at.toISOString(),
  used_at: v.used_at?.toISOString() ?? null,
  expired_at: v.expired_at?.toISOString() ?? null,
  client_ip: v.client_ip ?? null,
  client_mac: v.client_mac ?? null,
  price_charged: Number(v.price_charged),
  password: v.password ?? null,
}))
```

- [ ] **Step 2: Add password to local Voucher interface in VoucherAdminTabs**

At line 26-38:

```ts
interface Voucher {
  id: string
  code: string
  profile_name: string | null
  user_name: string | null
  status: string
  generated_at: string
  used_at: string | null
  expired_at: string | null
  client_ip: string | null
  client_mac: string | null
  price_charged: number
  password?: string | null
}
```

- [ ] **Step 3: Pass password in openDetail mapping**

At line 341-356 in `VoucherAdminTabs.tsx`, add `password: v.password`:

```ts
const openDetail = (v: Voucher) => {
  setSelectedVoucher({
    id: v.id,
    code: v.code,
    profile: v.profile_name,
    user_name: v.user_name,
    generated_at: v.generated_at,
    used_at: v.used_at,
    expired_at: v.expired_at,
    status: v.status,
    client_ip: v.client_ip,
    client_mac: v.client_mac,
    price_charged: v.price_charged,
    password: v.password,
  })
  setDetailOpen(true)
}
```

- [ ] **Step 4: TypeScript check — no errors in these two files**

```bash
npx tsc --noEmit 2>&1 | grep -E "admin/vouchers"
```

Expected: no lines.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/admin/vouchers/page.tsx src/app/(dashboard)/admin/vouchers/VoucherAdminTabs.tsx
git commit -m "feat: pass password through admin voucher pipeline to detail modal"
```

---

## Task 7: Reseller pipeline — page serialisation + VouchersClient

**Files:**
- Modify: `src/app/(dashboard)/reseller/vouchers/page.tsx:70-81`
- Modify: `src/app/(dashboard)/reseller/vouchers/VouchersClient.tsx:9-14,45-52`

- [ ] **Step 1: Add password to serializedVouchers in reseller page**

At line 70-81 in `page.tsx`, add `password: v.password ?? null`:

```ts
const serializedVouchers = vouchers.map((v) => ({
  id: v.id,
  code: v.code,
  status: v.status,
  price_charged: Number(v.price_charged),
  generated_at: v.generated_at.toISOString(),
  used_at: v.used_at?.toISOString() ?? null,
  expired_at: v.expired_at?.toISOString() ?? null,
  client_ip: v.client_ip,
  client_mac: v.client_mac,
  profile: v.profile ? { id: v.profile.id, name: v.profile.name } : null,
  password: v.password ?? null,
}))
```

- [ ] **Step 2: Add password to SerializedVoucher type in VouchersClient**

At line 9-14:

```ts
export type SerializedVoucher = {
  id: string; code: string; status: string; price_charged: number
  generated_at: string; used_at: string | null; expired_at: string | null
  client_ip: string | null; client_mac: string | null
  profile: { id: string; name: string } | null
  password?: string | null
}
```

- [ ] **Step 3: Pass password in handleRowClick mapping**

At line 45-52:

```ts
const handleRowClick = (v: SerializedVoucher) => {
  setSelectedVoucher({
    id: v.id, code: v.code, profile: v.profile?.name ?? null, user_name: null,
    generated_at: v.generated_at, used_at: v.used_at, expired_at: v.expired_at,
    status: v.status, client_ip: v.client_ip, client_mac: v.client_mac,
    price_charged: v.price_charged,
    password: v.password,
  })
  setModalOpen(true)
}
```

- [ ] **Step 4: TypeScript check — zero errors across entire project**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/reseller/vouchers/page.tsx src/app/(dashboard)/reseller/vouchers/VouchersClient.tsx
git commit -m "feat: pass password through reseller voucher pipeline to detail modal"
```

---

## Task 8: Smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test usernameEqualsPassword = ON (no prefix)**

1. Go to `/admin/voucher-settings` — Live Preview shows same code for Username and Password
2. Generate a voucher via Admin Dashboard — VoucherSuccessModal shows only KODE VOUCHER (no separate password row — expected, same as before)
3. Go to `/admin/vouchers`, click the new voucher → Detail tab: Password row shows the code value; Card tab: Password row shows the code value

- [ ] **Step 3: Test usernameEqualsPassword = OFF + password prefix**

1. Go to `/admin/voucher-settings` → toggle off Username=Password → set Password Prefix = `PS` → Save
2. Live Preview shows: Username = `{code}`, Password = `PS{random8chars}`; config summary shows Password Prefix = `PS`
3. Generate a voucher → VoucherSuccessModal shows Username + Password with `PS` prefix
4. Open the voucher in Detail → Password row shows `PS{8-char-random}` (not "sama dengan kode")

- [ ] **Step 4: Test old voucher fallback**

1. Find a voucher generated before this migration (password column = NULL)
2. Open in Detail → Password row shows the voucher's code value (fallback to code)

- [ ] **Step 5: Test reseller flow**

1. Log in as a reseller
2. Generate a voucher → VoucherSuccessModal behaves same as admin
3. Go to `/reseller/vouchers`, click a voucher → Detail shows Password row

- [ ] **Step 6: Production build check**

```bash
npm run build
```

Expected: `Compiled successfully`. Zero TypeScript errors.
