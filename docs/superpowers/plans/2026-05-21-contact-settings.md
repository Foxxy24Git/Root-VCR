# Contact Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin dapat mengatur nomor WhatsApp dan template pesan Top Up/Withdraw. Tombol Top Up/Withdraw reseller membuka WhatsApp dengan nomor & pesan sesuai konfigurasi admin.

**Architecture:** Tabel `Setting` (key-value store) sudah ada — tambah 3 entry via migration SQL idempotent. API `/api/settings/contact` (GET untuk auth user, PUT admin-only). Tab `Contact` baru di `AdminSettingsForm`. `WalletCard` di-refactor untuk fetch settings on-demand, render template variabel `{amount}`, `{email}`, `{name}`, normalisasi nomor `08xx` → `628xx`.

**Tech Stack:** Next.js 14 App Router, Prisma, NextAuth, React client components, Tailwind.

---

## File Structure

**New files:**
- `prisma/migrations/<timestamp>_add_whatsapp_settings/migration.sql` — INSERT default settings idempotent
- `src/app/api/settings/contact/route.ts` — GET/PUT handlers

**Modified files:**
- `prisma/seed.ts` — append 3 new settings ke array `settings` agar fresh DB punya defaults
- `src/app/(dashboard)/admin/settings/AdminSettingsForm.tsx` — extend `Settings` interface, tambah `ContactTab`, register di tabs array
- `src/components/cards/WalletCard.tsx` — refactor handlers, tambah props `userEmail`/`userName`
- `src/app/(dashboard)/reseller/dashboard/page.tsx` — load `email` & `name` user dan pass ke `WalletCard`

---

## Task 1: Database Migration

**Files:**
- Create: `prisma/migrations/<timestamp>_add_whatsapp_settings/migration.sql`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Create migration via prisma**

Run:
```bash
cd /Users/user/Root-VCR && npx prisma migrate dev --name add_whatsapp_settings --create-only
```

This creates an empty migration folder. Edit the SQL.

- [ ] **Step 2: Write SQL into migration**

Replace migration.sql content with:
```sql
INSERT INTO settings ("id", "key", "value", "type", "updated_at") VALUES
  (gen_random_uuid(), 'whatsapp_number', '0822882231533', 'string', NOW()),
  (gen_random_uuid(), 'whatsapp_topup_message', 'Halo Admin, saya mau topup saldo Rp {amount} untuk akun {email}', 'string', NOW()),
  (gen_random_uuid(), 'whatsapp_withdraw_message', 'Halo Admin, saya mau withdraw saldo Rp {amount} untuk akun {email}', 'string', NOW())
ON CONFLICT ("key") DO NOTHING;
```

- [ ] **Step 3: Apply migration**

Run:
```bash
cd /Users/user/Root-VCR && npx prisma migrate dev
```
Expected: "Database is now in sync" + Prisma Client regenerated.

- [ ] **Step 4: Update seed.ts** — append to `settings` array in `prisma/seed.ts` (line 12-24):

```ts
{ key: "whatsapp_number", value: "0822882231533", type: "string" },
{ key: "whatsapp_topup_message", value: "Halo Admin, saya mau topup saldo Rp {amount} untuk akun {email}", type: "string" },
{ key: "whatsapp_withdraw_message", value: "Halo Admin, saya mau withdraw saldo Rp {amount} untuk akun {email}", type: "string" },
```

- [ ] **Step 5: Verify settings in DB**

Run:
```bash
cd /Users/user/Root-VCR && npx prisma studio --browser none &
```
or query directly:
```bash
psql $DATABASE_URL -c "SELECT key, value FROM settings WHERE key LIKE 'whatsapp_%';"
```
Expected: 3 rows returned.

- [ ] **Step 6: Commit**

```bash
cd /Users/user/Root-VCR && git add prisma/ && git commit -m "feat: add whatsapp contact settings to database"
```

---

## Task 2: Contact Settings API

**Files:**
- Create: `src/app/api/settings/contact/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

const KEYS = ["whatsapp_number", "whatsapp_topup_message", "whatsapp_withdraw_message"] as const
type ContactKey = (typeof KEYS)[number]

const PHONE_RE = /^(08|628)\d{8,12}$/

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const rows = await prisma.setting.findMany({ where: { key: { in: [...KEYS] } } })
  const result: Record<ContactKey, string | null> = {
    whatsapp_number: null,
    whatsapp_topup_message: null,
    whatsapp_withdraw_message: null,
  }
  rows.forEach(r => { result[r.key as ContactKey] = r.value })
  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  let body: Partial<Record<ContactKey, string>>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Bad Request", message: "Body tidak valid" }, { status: 400 })
  }

  const number = body.whatsapp_number?.trim()
  const topup = body.whatsapp_topup_message?.trim()
  const withdraw = body.whatsapp_withdraw_message?.trim()

  if (!number || !PHONE_RE.test(number)) {
    return NextResponse.json({ error: "Validation Error", message: "Format nomor WhatsApp tidak valid (08xx atau 628xx)" }, { status: 422 })
  }
  if (!topup) {
    return NextResponse.json({ error: "Validation Error", message: "Template Topup wajib diisi" }, { status: 422 })
  }
  if (!withdraw) {
    return NextResponse.json({ error: "Validation Error", message: "Template Withdraw wajib diisi" }, { status: 422 })
  }

  const updates: Array<{ key: ContactKey; value: string }> = [
    { key: "whatsapp_number", value: number },
    { key: "whatsapp_topup_message", value: topup },
    { key: "whatsapp_withdraw_message", value: withdraw },
  ]

  try {
    await prisma.$transaction(
      updates.map(u =>
        prisma.setting.upsert({
          where: { key: u.key },
          update: { value: u.value, type: "string" },
          create: { key: u.key, value: u.value, type: "string" },
        })
      )
    )
    return NextResponse.json({ message: "Pengaturan kontak tersimpan" })
  } catch {
    return NextResponse.json({ error: "Server Error", message: "Gagal menyimpan" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Smoke test (when dev server running)**

```bash
curl -s http://localhost:3000/api/settings/contact
```
Expected: JSON with 3 keys (or 401 if no session).

- [ ] **Step 3: Commit**

```bash
cd /Users/user/Root-VCR && git add src/app/api/settings/contact/ && git commit -m "feat: add contact settings API"
```

---

## Task 3: Admin Settings — Contact Tab

**Files:**
- Modify: `src/app/(dashboard)/admin/settings/AdminSettingsForm.tsx`

- [ ] **Step 1: Extend `Settings` interface (around line 21-32)**

Add three keys:
```ts
interface Settings {
  // ... existing keys ...
  whatsapp_number?: string
  whatsapp_topup_message?: string
  whatsapp_withdraw_message?: string
}
```

- [ ] **Step 2: Add `MessageCircle` to lucide-react imports (line 6-10)**

```ts
import {
  Server, Globe, HardDrive, Lock, User,
  CheckCircle2, Loader2, Eye, EyeOff, RefreshCw, AlertCircle,
  Camera, Trash2, AlertTriangle, MessageCircle,
} from "lucide-react"
```

- [ ] **Step 3: Add `ContactTab` component before `// ── Tab: Security` section (around line 491)**

```tsx
// ── Tab: Contact ─────────────────────────────────────────────────────────────

function ContactTab({ settings }: { settings: Settings }) {
  const [form, setForm] = useState({
    whatsapp_number: settings.whatsapp_number ?? "",
    whatsapp_topup_message: settings.whatsapp_topup_message ?? "",
    whatsapp_withdraw_message: settings.whatsapp_withdraw_message ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const topupRef = useRef<HTMLTextAreaElement>(null)
  const withdrawRef = useRef<HTMLTextAreaElement>(null)

  const validatePhone = (v: string) => /^(08|628)\d{8,12}$/.test(v)

  const insertVar = (ref: React.RefObject<HTMLTextAreaElement>, field: "whatsapp_topup_message" | "whatsapp_withdraw_message", variable: string) => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart ?? form[field].length
    const end = el.selectionEnd ?? form[field].length
    const newValue = form[field].slice(0, start) + variable + form[field].slice(end)
    setForm(p => ({ ...p, [field]: newValue }))
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + variable.length
      el.setSelectionRange(caret, caret)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validatePhone(form.whatsapp_number)) {
      setPhoneError("Format nomor WhatsApp tidak valid (08xx atau 628xx)")
      return
    }
    setPhoneError(null)
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/settings/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setMsg({ type: res.ok ? "success" : "error", text: data.message || (res.ok ? "Tersimpan" : "Gagal") })
    } catch {
      setMsg({ type: "error", text: "Gagal menyimpan pengaturan" })
    } finally {
      setSaving(false)
    }
  }

  const renderPreview = (template: string) =>
    template
      .replaceAll("{amount}", "100.000")
      .replaceAll("{email}", "reseller@example.com")
      .replaceAll("{name}", "Demo Reseller")

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Nomor WhatsApp Admin</label>
        <input
          value={form.whatsapp_number}
          onChange={e => { setForm(p => ({ ...p, whatsapp_number: e.target.value })); setPhoneError(null) }}
          className={inputCls}
          placeholder="0822xxxxxxxx atau 628xxxxxxxxxx"
        />
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Format: <code>08xx</code> atau <code>628xx</code>. Reseller akan dikirim ke nomor ini saat klik Top Up / Withdraw.</p>
        {phoneError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{phoneError}</p>
        )}
      </div>

      {([
        { key: "whatsapp_topup_message", label: "Template Pesan Topup", ref: topupRef },
        { key: "whatsapp_withdraw_message", label: "Template Pesan Withdraw", ref: withdrawRef },
      ] as const).map(({ key, label, ref }) => (
        <div key={key}>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">{label}</label>
          <textarea
            ref={ref}
            rows={3}
            value={form[key]}
            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            className={`${inputCls} resize-y font-mono text-sm`}
            placeholder="Halo Admin, saya mau ... Rp {amount} untuk akun {email}"
          />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Sisipkan variabel:</span>
            {["{amount}", "{email}", "{name}"].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => insertVar(ref, key, v)}
                className="text-xs font-mono px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <button
          type="button"
          onClick={() => setShowPreview(v => !v)}
          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showPreview ? "Sembunyikan preview" : "Lihat preview pesan"}
        </button>

        {showPreview && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Preview Topup</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">{renderPreview(form.whatsapp_topup_message) || <span className="italic text-slate-400">—</span>}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Preview Withdraw</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">{renderPreview(form.whatsapp_withdraw_message) || <span className="italic text-slate-400">—</span>}</p>
            </div>
          </div>
        )}
      </div>

      <SaveBar saving={saving} msg={msg} />
    </form>
  )
}
```

- [ ] **Step 4: Register tab in tabs array (around line 714-722)**

Update `activeTab` union and tabs array:
```ts
const [activeTab, setActiveTab] = useState<"profile" | "mikrotik" | "hotspot" | "contact" | "backup" | "security" | "danger">("profile")

const tabs = [
  { id: "profile", label: "Profil", icon: <User className="w-4 h-4" /> },
  { id: "mikrotik", label: "MikroTik", icon: <Server className="w-4 h-4" /> },
  { id: "hotspot", label: "Hotspot", icon: <Globe className="w-4 h-4" /> },
  { id: "contact", label: "Contact", icon: <MessageCircle className="w-4 h-4" /> },
  { id: "backup", label: "Backup", icon: <HardDrive className="w-4 h-4" /> },
  { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
  { id: "danger", label: "Reset Data", icon: <Trash2 className="w-4 h-4" /> },
] as const
```

- [ ] **Step 5: Render Contact tab content (in main tab-content switch, after Hotspot block, around line 763)**

```tsx
{activeTab === "contact" && (
  <div className="space-y-4">
    <h3 className="font-bold text-slate-900 dark:text-slate-100">Contact & Topup Settings</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400">Atur nomor WhatsApp dan template pesan yang dipakai tombol Top Up/Withdraw di dashboard reseller.</p>
    <ContactTab settings={settings} />
  </div>
)}
```

- [ ] **Step 6: Type-check**

```bash
cd /Users/user/Root-VCR && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/user/Root-VCR && git add src/app/\(dashboard\)/admin/settings/AdminSettingsForm.tsx && git commit -m "feat: add Contact tab to admin settings"
```

---

## Task 4: WalletCard Refactor

**Files:**
- Modify: `src/components/cards/WalletCard.tsx`

- [ ] **Step 1: Rewrite WalletCard with template rendering and settings fetch**

Replace contents of `src/components/cards/WalletCard.tsx`:
```tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Wallet, Plus, ArrowUpRight } from "lucide-react"

export interface WalletCardProps extends React.HTMLAttributes<HTMLDivElement> {
  balance: number
  userEmail?: string
  userName?: string
  onTopUpClick?: () => void
  onWithdrawClick?: () => void
}

type ContactSettings = {
  whatsapp_number: string | null
  whatsapp_topup_message: string | null
  whatsapp_withdraw_message: string | null
}

function normalizePhone(v: string): string {
  // Convert 08xx → 628xx; if already 628xx keep
  const digits = v.replace(/\D/g, "")
  if (digits.startsWith("0")) return "62" + digits.slice(1)
  return digits
}

function renderTemplate(template: string, vars: { amount: string; email: string; name: string }): string {
  return template
    .replaceAll("{amount}", vars.amount)
    .replaceAll("{email}", vars.email)
    .replaceAll("{name}", vars.name)
}

async function openWaForAction(action: "topup" | "withdraw", userEmail: string, userName: string) {
  const raw = window.prompt(`Masukkan nominal ${action === "topup" ? "Top Up" : "Withdraw"} (contoh: 100000):`)
  if (!raw) return
  const amountDigits = raw.replace(/\D/g, "")
  if (!amountDigits) return

  let settings: ContactSettings | null = null
  try {
    const res = await fetch("/api/settings/contact")
    if (res.ok) settings = await res.json()
  } catch {
    // fall through to null check
  }

  if (!settings?.whatsapp_number) {
    window.alert("Admin belum mengatur nomor WhatsApp. Hubungi admin.")
    return
  }

  const template = action === "topup"
    ? (settings.whatsapp_topup_message ?? "")
    : (settings.whatsapp_withdraw_message ?? "")

  const message = renderTemplate(template, {
    amount: Number(amountDigits).toLocaleString("id-ID"),
    email: userEmail,
    name: userName,
  })

  const phone = normalizePhone(settings.whatsapp_number)
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
}

export function WalletCard({
  balance,
  userEmail = "",
  userName = "",
  onTopUpClick,
  onWithdrawClick,
  className,
  ...props
}: WalletCardProps) {
  const handleTopUp = onTopUpClick ?? (() => openWaForAction("topup", userEmail, userName))
  const handleWithdraw = onWithdrawClick ?? (() => openWaForAction("withdraw", userEmail, userName))

  return (
    <div
      className={cn(
        "relative overflow-hidden p-6 rounded-[20px] shadow-xl",
        "bg-gradient-to-br from-blue-500 to-cyan-500",
        "text-white",
        className
      )}
      {...props}
    >
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white opacity-10 blur-xl" />

      <div className="relative z-10 w-full">
        <div className="flex items-center gap-2 mb-6 opacity-90">
          <Wallet className="h-5 w-5" />
          <span className="text-sm font-medium tracking-wide uppercase">
            Available Balance
          </span>
        </div>

        <div className="mb-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Rp {Number(balance).toLocaleString("id-ID")}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleTopUp}
            className="flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Top Up
          </button>

          <button
            onClick={handleWithdraw}
            className="flex items-center gap-2 rounded-xl bg-transparent border border-white/30 hover:bg-white/10 px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="h-4 w-4" />
            Withdraw
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/user/Root-VCR && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/user/Root-VCR && git add src/components/cards/WalletCard.tsx && git commit -m "feat: WalletCard fetches contact settings and renders templates"
```

---

## Task 5: Reseller Dashboard — pass user info

**Files:**
- Modify: `src/app/(dashboard)/reseller/dashboard/page.tsx`

- [ ] **Step 1: Load `name` in dbUser select (line 24-27)**

Change:
```ts
prisma.user.findUnique({
  where: { id: user.id },
  select: { fee_percentage: true, name: true, email: true },
}),
```

- [ ] **Step 2: Pass `userEmail`/`userName` to WalletCard (line 90)**

Change:
```tsx
<WalletCard
  balance={balance}
  userEmail={dbUser?.email ?? user.email}
  userName={dbUser?.name ?? user.name}
/>
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/user/Root-VCR && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Root-VCR && git add src/app/\(dashboard\)/reseller/dashboard/page.tsx && git commit -m "feat: pass reseller email and name to WalletCard"
```

---

## Task 6: Manual Verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/user/Root-VCR && npm run dev
```

- [ ] **Step 2: Verify GET endpoint (login as admin first to set cookie)**

Open browser:
1. `http://localhost:3000/login` → login as admin
2. Visit `http://localhost:3000/api/settings/contact` → JSON returns 3 keys with default values.

- [ ] **Step 3: Verify Admin UI**

1. Go to `http://localhost:3000/admin/settings`
2. Click **Contact** tab.
3. See nomor `0822882231533` and two templates pre-filled.
4. Click chip `{amount}` to insert into topup template — variable inserted at cursor.
5. Click **Lihat preview pesan** — see rendered preview with dummy data.
6. Change number to invalid `123` → Save → see error "Format nomor WhatsApp tidak valid".
7. Set valid number `08123456789`, Save → "Pengaturan kontak tersimpan".
8. Reload page → values persist.

- [ ] **Step 4: Verify Reseller flow**

1. Logout admin, login as reseller (or create one via admin panel first).
2. Dashboard → click **Top Up** → enter `100000` in prompt.
3. New tab opens to `wa.me/628123456789?text=...` with message containing `Rp 100.000` and reseller email.
4. Same for **Withdraw**.

- [ ] **Step 5: Verify empty-WA fallback**

1. As admin, set `whatsapp_number` to empty (via Prisma Studio or by editing DB) — admin form requires valid, so use DB direct.
   Or skip this step and trust the null check.
2. As reseller, click Top Up → enter amount → alert "Admin belum mengatur nomor WhatsApp. Hubungi admin." → no new tab.

- [ ] **Step 6: Type & lint check**

```bash
cd /Users/user/Root-VCR && npx tsc --noEmit && npm run lint
```
Expected: no errors.

---

## Notes

- All commits done individually per task; final integration commit not needed.
- No new dependencies.
- Existing settings endpoint `/api/settings` untouched (still serves admin-wide settings dict).
