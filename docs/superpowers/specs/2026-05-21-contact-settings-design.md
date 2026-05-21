# Contact Settings — Design Spec

**Date:** 2026-05-21
**Status:** Approved
**Topic:** Configurable admin WhatsApp number & topup/withdraw message templates

## Background

Saat ini tombol Top Up dan Withdraw di `WalletCard` (reseller dashboard) **hardcode** nomor WhatsApp (`6282288231533`) dan pesan (`HALOO TOP UP {amount}` / `HALOO WITHDRAW {amount}`) di `src/components/cards/WalletCard.tsx`.

Admin perlu kemampuan mengubah:
1. Nomor WhatsApp tujuan
2. Template pesan Top Up
3. Template pesan Withdraw

Reseller dashboard harus baca konfigurasi tsb dan render template dengan data sebenarnya saat tombol diklik.

## Scope

In-scope:
- 3 setting baru di tabel `settings` key-value store
- API `GET/PUT /api/settings/contact`
- Tab baru `Contact` di Admin Settings Page
- Refactor `WalletCard` agar fetch settings dan render template
- Validasi format nomor WhatsApp
- Variabel template: `{amount}`, `{email}`, `{name}`

Out-of-scope:
- Toast/notification library (pakai `window.alert`)
- History/audit log perubahan settings

## Data Model

Tidak ada perubahan schema. Tabel `Setting(key, value, type, updated_at)` sudah cukup.

Tiga entry baru (default value):

| key | value default | type |
|---|---|---|
| `whatsapp_number` | `0822882231533` | string |
| `whatsapp_topup_message` | `Halo Admin, saya mau topup saldo Rp {amount} untuk akun {email}` | string |
| `whatsapp_withdraw_message` | `Halo Admin, saya mau withdraw saldo Rp {amount} untuk akun {email}` | string |

Insertion via migration SQL (`INSERT … ON CONFLICT(key) DO NOTHING`) — non-destructive, idempotent.

## API

### `GET /api/settings/contact`

Auth: session required (admin atau reseller). Reseller butuh ini saat klik Top Up.

Response:
```json
{
  "whatsapp_number": "0822882231533",
  "whatsapp_topup_message": "Halo Admin, saya mau topup...",
  "whatsapp_withdraw_message": "Halo Admin, saya mau withdraw..."
}
```

### `PUT /api/settings/contact`

Auth: admin only.

Request body:
```json
{
  "whatsapp_number": "0822882231533",
  "whatsapp_topup_message": "Halo Admin, ...",
  "whatsapp_withdraw_message": "Halo Admin, ..."
}
```

Server-side validation:
- `whatsapp_number`: required, `^(08|628)\d{8,12}$`
- Template strings: required, non-empty

Response: `{ message: "Tersimpan" }` or 422 with `{ error, message }`.

## Components

### Admin UI — `AdminSettingsForm.tsx`

Tab baru `Contact` (icon: `MessageCircle` dari lucide-react), urutan: setelah Hotspot.

Form:
- **Nomor WhatsApp Admin** (input text) — placeholder `0822xxxxxxxx`, helper text "Format: 08xx atau 628xx", client validation
- **Template Pesan Topup** (textarea, 3 rows)
- **Template Pesan Withdraw** (textarea, 3 rows)
- Di bawah tiap textarea: chip helper `{amount}` `{email}` `{name}` — klik chip → insert ke posisi cursor textarea
- Tombol **Lihat preview pesan** → expand area dengan render dummy:
  - amount: `100.000`
  - email: `reseller@example.com`
  - name: `Demo Reseller`
- Tombol **Simpan Pengaturan** (pakai `SaveBar` existing)

### `WalletCard.tsx` Refactor

Tambah props:
```ts
interface WalletCardProps {
  balance: number
  userEmail?: string   // diperlukan untuk render template
  userName?: string    // diperlukan untuk render template
  // onTopUpClick / onWithdrawClick tetap optional override
}
```

Default handler `handleTopUp` / `handleWithdraw`:
1. Prompt amount (existing pattern)
2. Fetch `/api/settings/contact` (atau cache via state on mount)
3. Jika `whatsapp_number` kosong/null → `alert("Admin belum mengatur nomor WhatsApp. Hubungi admin.")` → return
4. Normalize nomor: `08xx` → `628xx`
5. Render template: `replaceAll("{amount}", amount.toLocaleString("id-ID")).replaceAll("{email}", userEmail).replaceAll("{name}", userName)`
6. `window.open("https://wa.me/" + normalized + "?text=" + encodeURIComponent(rendered))`

### Reseller dashboard page

Pass `userEmail` and `userName` ke `<WalletCard>` dari server-side data (`user.email`, `dbUser.name` — load name juga).

## Edge Cases

- **WA number empty:** alert, jangan buka window.
- **Amount input tidak diisi:** existing behavior (return early).
- **Variabel tidak diisi user di template:** tetap render literal (mis. user hapus `{email}` dari template → tidak masalah).
- **Concurrent admin save:** upsert idempotent, tidak ada lock concern.

## Testing

Manual:
1. Login admin → Settings → Contact → ubah nomor & template → Save → reload → nilai persist.
2. Login admin → Settings → Contact → coba nomor invalid (`123`) → tampil error validation.
3. Login reseller → klik Top Up → masukkan amount → WA terbuka dengan pesan & nomor sesuai admin setting.
4. Login admin (settings page) → kosongkan whatsapp_number, simpan → login reseller → klik Top Up → alert muncul, WA tidak terbuka.

## Files Touched

- `prisma/migrations/<timestamp>_add_whatsapp_settings/migration.sql` (new)
- `src/app/api/settings/contact/route.ts` (new)
- `src/app/(dashboard)/admin/settings/AdminSettingsForm.tsx` (new tab + ContactTab)
- `src/app/(dashboard)/admin/settings/page.tsx` (no change — settings dict already passed)
- `src/components/cards/WalletCard.tsx` (refactor handlers, new props)
- `src/app/(dashboard)/reseller/dashboard/page.tsx` (pass userEmail/userName to WalletCard)
- `prisma/seed.ts` (optional: add 3 settings to seed for fresh DB)
