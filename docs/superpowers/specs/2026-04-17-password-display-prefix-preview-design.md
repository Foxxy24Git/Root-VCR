# Password Display + Password Prefix + Live Preview Sync

**Date:** 2026-04-17  
**Status:** Approved

---

## Problem

1. Password tidak tersimpan di DB → Detail Voucher tidak bisa menampilkan password
2. Tidak ada konfigurasi password prefix
3. Live Preview di Voucher Settings hanya menampilkan kode — tidak menampilkan username/password
4. Berlaku untuk admin dan reseller (keduanya pakai endpoint yang sama)

---

## Solution Overview

Tambah kolom `password` ke tabel `vouchers`, simpan password saat generate, tampilkan di Detail Voucher dan Live Preview. Tambah setting `voucher_password_prefix` untuk prefix password.

---

## Architecture

### 1. DB Schema — `prisma/schema.prisma`

Tambah satu field nullable ke model `Voucher`:

```prisma
password String? @db.VarChar(60)
```

Old vouchers → `password = null` → ditangani dengan fallback display (lihat bagian 6).

Run: `prisma migrate dev --name add_voucher_password`

---

### 2. New Setting — `voucher_password_prefix`

Disimpan di tabel `Setting` dengan key `voucher_password_prefix`. Max 5 karakter alphanumerik. Default: `""` (kosong).

Tidak perlu migrasi DB — settings adalah key-value rows di tabel yang sudah ada.

---

### 3. Generate Route — `src/app/api/vouchers/generate/route.ts`

**Load setting tambahan:**
```ts
const settings = await prisma.setting.findMany({
  where: {
    key: {
      in: [
        "voucher_prefix",
        "voucher_code_length",
        "voucher_code_format",
        "voucher_username_equals_password",
        "voucher_password_prefix",   // NEW
      ],
    },
  },
})
const passwordPrefix = getSetting("voucher_password_prefix", "")
```

**Password generation:**
```ts
const passwords: string[] = codes.map((code) =>
  usernameEqualsPassword ? code : passwordPrefix + generateRandomPassword(8)
)
```

**Simpan ke DB** (di dalam `tx.voucher.create`):
```ts
data: {
  code,
  password: passwords[i],   // NEW — simpan untuk semua voucher
  user_id: user.id,
  ...
}
```

**Response tetap sama** — password di-attach per voucher:
```ts
password: usernameEqualsPassword ? null : passwords[i]
```

Behavior `VoucherSuccessModal` tidak berubah (tetap null untuk `usernameEqualsPassword=true`).

---

### 4. Settings Page — `src/app/(dashboard)/admin/voucher-settings/page.tsx`

Load `voucher_password_prefix` dari settings dan pass ke form:

```ts
const initial = {
  voucher_prefix: map.voucher_prefix ?? "",
  voucher_code_length: parseInt(map.voucher_code_length ?? "8"),
  voucher_code_format: toCodeFormat(map.voucher_code_format),
  voucher_username_equals_password: map.voucher_username_equals_password === "true",
  voucher_password_prefix: map.voucher_password_prefix ?? "",   // NEW
}
```

Update `VoucherSettingsFormProps` interface untuk menerima field baru.

---

### 5. VoucherSettingsForm — `src/app/(dashboard)/admin/voucher-settings/VoucherSettingsForm.tsx`

**State baru:**
```ts
const [passwordPrefix, setPasswordPrefix] = useState(initial.voucher_password_prefix)
const [previewPassword, setPreviewPassword] = useState(() => generateRandomPassword(8))
```

**Handler:**
```ts
const handlePasswordPrefixChange = (v: string) => {
  const clean = v.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5)
  setPasswordPrefix(clean)
}
```

**Refresh preview** — update `refreshPreview` untuk regenerate `previewPassword` juga:
```ts
const refreshPreview = useCallback(() => {
  setPreview(generatePreview(prefix, codeLength, format))
  setPreviewPassword(generateRandomPassword(8))
}, [prefix, codeLength, format])
```

**UI — Field baru di "Core Formatting" card**, setelah field Code Prefix:

```
PASSWORD PREFIX (maks 5 karakter, alfanumerik)
[input field] [counter x/5]
```

**UI — Live Preview update:**

Di bawah preview code box, tambah dua baris:

```
USERNAME    │  {preview}
PASSWORD    │  {usernameEqualsPassword ? preview : passwordPrefix + previewPassword}
```

Displayed as rows in the config summary section.

**Save — tambah ke updates array:**
```ts
{ key: "voucher_password_prefix", value: passwordPrefix }
```

---

### 6. VoucherDetailModal — `src/components/modals/VoucherDetailModal.tsx`

**Interface update:**
```ts
export interface VoucherDetail {
  // ... existing fields
  password?: string | null   // NEW
}
```

**Display logic (password row):**

```ts
function resolvePasswordDisplay(password: string | null | undefined, code: string): string {
  if (password !== null && password !== undefined) {
    return password === code ? "sama dengan kode" : password
  }
  // old voucher (null) — username always equals code in this system
  return code
}
```

Tampilkan row PASSWORD di bawah row Kode Voucher di detail view:

```
PASSWORD
{resolvePasswordDisplay(voucher.password, voucher.code)}
```

Juga tambahkan ke **Card view** di grid.

---

### 7. API Response — `GET /api/vouchers/[id]`

Tidak perlu perubahan kode. Begitu `password` ada di Prisma schema, `prisma.voucher.findUnique({ include: ... })` akan otomatis meng-include field tersebut di response JSON.

---

### 8. Components yang pass `VoucherDetail`

Cek dan update semua tempat yang map API response ke `VoucherDetail` shape untuk meneruskan field `password`.

---

## Display Logic Summary

| Kondisi | Tampilan Password |
|---------|-------------------|
| `password` tersimpan, `password === code` | `sama dengan kode` |
| `password` tersimpan, `password !== code` | nilai password aktual |
| `password === null` (voucher lama) | tampilkan `code` (fallback: username = code) |

---

## Validation

- `passwordPrefix`: max 5 karakter, hanya alfanumerik, optional
- Tidak boleh `undefined` — default ke `""`
- Berlaku untuk admin dan reseller (keduanya pakai endpoint `/api/vouchers/generate` yang sama)

---

## Files Changed

| File | Perubahan |
|------|-----------|
| `prisma/schema.prisma` | Tambah `password String?` ke model Voucher |
| `src/app/api/vouchers/generate/route.ts` | Load prefix, store password, apply prefix |
| `src/app/(dashboard)/admin/voucher-settings/page.tsx` | Load `voucher_password_prefix` |
| `src/app/(dashboard)/admin/voucher-settings/VoucherSettingsForm.tsx` | Password prefix field + updated live preview |
| `src/components/modals/VoucherDetailModal.tsx` | Tambah `password` ke interface + display row |
| Komponen list voucher (admin + reseller) | Pass `password` field ke `VoucherDetail` |
