# WhatsApp Bot — Perintah Voucher Berbasis Durasi

**Tanggal:** 2026-06-29
**Status:** Diimplementasikan — **skema diubah ke NOMOR urut** (lihat Revisi)
**Scope:** `whatsapp-bot/` (tanpa perubahan endpoint `/api/bot/*`)

## Revisi 2026-06-29 — token durasi → nomor urut

Saat diuji dengan data nyata, **semua paket punya `duration_days=0` &
`duration_hours=0`** (durasi hanya ada di teks nama, mis. "1 hari root net"),
dan ada paket dengan durasi kembar (dua paket "1 hari" beda harga). Akibatnya
skema token durasi (`#vcr-1hari`) tidak bisa menampilkan perintah maupun
menunjuk paket secara unik.

**Keputusan baru:** perintah berbasis **nomor urut** paket pada daftar `#menu`
(terurut harga asc, sesuai `/api/bot/profiles`): `#vcr-1`, `#vcr-2`, dst.
- `parseVcrIndex(text)` menggantikan `parseVcrToken`.
- `resolveIndexToProfile(index, profiles)` menggantikan `resolveTokenToProfile`.
- `profileToken` dihapus; `menuText` menampilkan daftar bernomor.
- `resolveReplyTarget` memakai nomor (untuk reply ke `#vcr-<n>`) atau cocok nama
  paket (untuk reply ke pesan sukses) — tetap.

Bagian "Model Token Durasi" di bawah **tidak lagi berlaku**; sisanya (alur,
penghapusan `#generate-vcr`, reply+Y, arsitektur modul, testing) tetap.

## Latar Belakang

Alur lama: reseller harus ketik `#generate-vcr` dulu untuk memunculkan daftar
paket bernomor, lalu `#vcr-<n>` di mana `n` = **urutan** paket pada sesi itu.
Ini menyimpan state per-pengirim (`pilih_profil`) dan butuh dua langkah.

## Tujuan

1. Hapus syarat `#generate-vcr`. Reseller bisa langsung generate.
2. Perintah voucher berbasis **durasi paket**, bukan urutan: `#vcr-1hari`,
   `#vcr-2hari`, `#vcr-3jam`.
3. Dua cara generate: (a) ketik `#vcr-<token>`, atau (b) **reply** sebuah pesan
   lalu ketik `Y`/`y`.
4. Daftar paket hanya tampil lewat `#menu`.

## Keputusan Desain

**Resolusi token di sisi bot (bukan server).** Bot memanggil `/api/bot/profiles`
(sudah ter-scope tenant + reseller), membangun peta `token → profile`, mencocokkan
perintah, lalu memanggil `/api/bot/generate-voucher` dengan `profileId` seperti
sekarang. Endpoint tidak diubah; endpoint generate sudah memvalidasi ulang akses,
saldo, dan keaktifan paket, jadi resolusi di klien tetap aman.

## Model Token Durasi

Dari `duration_days` & `duration_hours` tiap paket dibentuk satu token:

| days | hours | token            | contoh perintah     |
|------|-------|------------------|---------------------|
| >0   | 0     | `<d>hari`        | `#vcr-1hari`        |
| 0    | >0    | `<h>jam`         | `#vcr-3jam`         |
| >0   | >0    | `<d>hari<h>jam`  | `#vcr-1hari12jam`   |
| 0    | 0     | (tidak ada)      | hanya tampil di menu, tak bisa di-generate langsung |

Normalisasi input: huruf kecil + semua spasi dibuang. Jadi `#vcr-1hari`,
`#vcr-1 hari`, dan `#VCR-1Hari` setara.

**Asumsi:** satu paket per durasi per reseller. Bila ada tabrakan token (dua
paket durasi sama), yang **termurah** menang (daftar paket sudah terurut harga
menaik dari API).

## Perilaku

### `#menu` — satu-satunya tampilan daftar
```
Halo {nama}! 👋
💰 Cek saldo: ketik #saldo

📦 Paket voucher kamu:
• 1 Hari — Rp 3.000  → ketik #vcr-1hari
• 2 Hari — Rp 6.000  → ketik #vcr-2hari

💡 Sudah pernah buat? Balas (reply) pesan voucher/perintahnya dengan "Y".
```
Paket unlimited (durasi 0) ditampilkan tanpa baris perintah.

### `#saldo`
Tidak berubah.

### `#vcr-<token>` — generate langsung
Ambil paket → cocokkan token → generate. Token tak cocok →
`"Paket {x} tidak tersedia. Ketik #menu untuk lihat paket kamu."`

### Reply + `Y`/`y`
Pemicu: teks pesan masuk `y`/`Y` (trim) **dan** pesan tersebut me-reply pesan lain.
Resolusi dari teks pesan yang di-reply (`contextInfo.quotedMessage`):
1. Mengandung `#vcr-<token>` → pakai token itu.
2. Pesan sukses voucher (ada baris `📦 Paket: <nama>`) → cari paket berdasarkan
   nama → generate lagi.
3. Selain itu (atau `y` tanpa reply) → hint singkat cara pakai.

### Penghapusan
- Perintah `#generate-vcr`.
- Format lama `#vcr-<angka>` berbasis urutan.
- State machine session (`state: 'pilih_profil'`, `session.profiles`). Setiap
  generate kini stateless (ambil paket fresh).

## Arsitektur

Ekstrak logika murni ke modul baru `whatsapp-bot/commands.js` (tanpa import
baileys) supaya bisa diuji unit; `index.js` tetap memegang socket, klien API,
dan mapping JID/LID, lalu mengimpor helper dari `commands.js`.

`commands.js` (murni, tanpa I/O):
- `formatRupiah(amount)`
- `profileToken(profile)` → string token atau `null`
- `parseVcrToken(text)` → token ternormalisasi atau `null`
- `resolveTokenToProfile(token, profiles)` → profile atau `null` (termurah menang)
- `menuText(name, profiles)`
- `voucherSuccessText(v)`
- `parsePaketFromSuccess(text)` → nama paket atau `null`
- `resolveReplyTarget(quotedText, profiles)` → profile atau `null`
- `extractMessageText(message)`, `jidToNumber(jid)`
- `TXT` (konstanta pesan)

`index.js`:
- `handleCommand(sock, jid, sender, rawText, quotedText)` — orkestrasi: identify →
  cek frozen → routing `#menu` / `#saldo` / `#vcr-<token>` / reply-Y / unknown.
- `messages.upsert` mengekstrak `quotedText` dari
  `msg.message.extendedTextMessage?.contextInfo?.quotedMessage` dan meneruskannya.

## Error & Edge Case
Dipertahankan: belum terdaftar, akun beku, saldo kurang (pesan dari API), error
generic, abaikan grup/broadcast/pesan dari bot sendiri.
Baru: token tak dikenal, paket durasi tak tersedia, reply `Y` tanpa konteks valid.

## Testing
`whatsapp-bot/` memakai test runner bawaan Node (`node --test`, zero-dependency,
Node ≥20). Tambah `whatsapp-bot/commands.test.js` untuk:
- `profileToken` (hari / jam / gabungan / unlimited)
- `parseVcrToken` (case-insensitive, abaikan spasi, format tak valid)
- `resolveTokenToProfile` (cocok, tak cocok, tabrakan → termurah)
- `menuText` (paket biasa + unlimited)
- `parsePaketFromSuccess` & `resolveReplyTarget` (token vs pesan sukses vs invalid)
Tambah script `"test": "node --test"` di `whatsapp-bot/package.json`.

## Yang TIDAK berubah
- Endpoint `/api/bot/*`.
- Alur `#daftar`, identify, pembekuan akun, mapping LID/JID.
- Kontrak respons `generate-voucher`.
```
