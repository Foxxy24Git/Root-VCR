# Root-VCR WhatsApp Bot

Service WhatsApp bot terpisah untuk Root-VCR, dibangun dengan
[Baileys](https://github.com/WhiskeySockets/Baileys). Terisolasi dari aplikasi
Next.js — punya `package.json` & `node_modules` sendiri.

## Fitur

- Connect ke WhatsApp via QR code (tampil di terminal).
- Session persistence di `auth_state/` (scan QR cukup sekali).
- Log setiap pesan masuk: nomor pengirim + isi pesan.
- **Menu & generate voucher** lewat chat pribadi (lihat di bawah).

### Perintah (chat pribadi)

Stateless — setiap perintah berdiri sendiri, tak perlu langkah pendahuluan.

| Pesan                   | Aksi                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| `#daftar <nomor>`       | Tautkan WhatsApp ini ke nomor HP terdaftar di Root-VCR.               |
| `#menu`                 | Tampilkan sapaan + daftar paket **bernomor** beserta perintahnya.     |
| `#saldo`                | Cek saldo wallet.                                                     |
| `#vcr-<nomor>`          | Generate voucher paket nomor itu, mis. `#vcr-1`, `#vcr-2`.            |
| reply pesan + `Y`/`y`   | Generate ulang: balas pesan voucher / perintah `#vcr-...` dengan `Y`. |

**Perintah voucher berbasis NOMOR urut paket** pada daftar `#menu` (terurut
harga termurah → termahal, sesuai `/api/bot/profiles`). Nomor dipilih, bukan
durasi, karena data paket bisa tak punya durasi terstruktur dan nama/durasinya
bisa kembar — penomoran selalu bisa menunjuk paket apa pun secara unik.

Setiap pesan diverifikasi dulu ke `/api/bot/identify`. Nomor yang belum
terdaftar / akun beku akan dibalas sopan dan diabaikan. Pesan di grup & status
diabaikan (flow voucher khusus chat pribadi). Semua error API ditangkap — bot
tidak akan crash, user dibalas pesan generic.

### Arsitektur kode

- `commands.js` — logika murni (token durasi, parser, teks balasan). Tanpa I/O.
- `handler.js` — orkestrasi perintah; `sock` & `api` di-inject (mudah dites).
- `index.js` — koneksi Baileys, klien API `/api/bot/*`, mapping LID/JID.

Test: `npm test` (memakai test runner bawaan Node, tanpa dependency tambahan).

## Konfigurasi (.env)

Bot membaca `whatsapp-bot/.env`. Salin dari contoh lalu isi:

```bash
cp .env.example .env
```

- `BASE_URL` — URL aplikasi Next.js Root-VCR (mis. `http://localhost:3000`).
- `BOT_API_SECRET` — harus **sama persis** dengan `BOT_API_SECRET` di `.env`
  aplikasi Next.js (dipakai sebagai header `x-bot-secret`).

> Catatan: nomor WhatsApp dikirim ke API apa adanya (format internasional tanpa
> `+`, mis. `628123...`). Pastikan kolom `phone` user di Root-VCR memakai format
> yang sama agar `identify` cocok.

## Menjalankan

```bash
cd whatsapp-bot
npm install        # sekali saja
cp .env.example .env  # lalu isi BASE_URL & BOT_API_SECRET
npm run bot
```

Saat pertama jalan, QR code muncul di terminal. Scan via:
**WhatsApp di HP → Perangkat Tertaut → Tautkan Perangkat**.

Setelah tertaut, kredensial tersimpan di `auth_state/` sehingga restart
berikutnya tidak perlu scan ulang.

## Reset sesi

Jika ingin ganti nomor / sesi rusak / status "logged out":

```bash
rm -rf auth_state/
npm run bot        # scan QR baru
```

## Catatan

- Versi Baileys di-pin ke `6.7.23` (rilis stabil terakhir / dist-tag `legacy`).
- `auth_state/` dan `node_modules/` di-ignore oleh git (lihat root `.gitignore`).
