# Panduan Tenant Admin — Root.VCR

Panduan untuk pemilik usaha hotspot (Tenant Admin). Mencakup cara login, setup
MikroTik, mengelola reseller & voucher, dan pembayaran langganan.

---

## 1. Login

1. Buka alamat aplikasi (mis. `https://app.example.com/login`).
2. Isi **3 kolom**:
   - **Kode Tenant** — kode usaha Anda (diberikan oleh penyedia layanan).
   - **Email** — email akun Anda.
   - **Password**.
3. Klik **Masuk**.

> Lupa password? Hubungi penyedia layanan (Super Admin) untuk reset.
> Demi keamanan, setelah 10 percobaan gagal dari satu jaringan, login dijeda
> sementara beberapa menit.

---

## 2. Setup MikroTik

Agar voucher otomatis dibuat di router, hubungkan MikroTik Anda terlebih dahulu.

1. Masuk menu **Pengaturan → MikroTik**.
2. Isi:
   - **Host/IP** — IP publik atau alamat tunnel router Anda.
   - **Port API** — biasanya `8728` (atau `8729` bila pakai SSL).
   - **Username** & **Password** API MikroTik.
   - **Gunakan SSL** — aktifkan bila router memakai api-ssl.
3. Klik **Simpan**.
4. Klik **Tes Koneksi**. Status akan menunjukkan **Berhasil** (hijau) atau
   **Gagal** (merah) beserta waktu pengetesan terakhir.

> Password MikroTik Anda disimpan **terenkripsi** dan tidak pernah ditampilkan
> kembali. Untuk menggantinya, cukup ketik password baru lalu Simpan.

**Jika Tes Koneksi gagal**, periksa: IP/port benar, service `api` aktif di
MikroTik (`/ip service`), dan firewall mengizinkan akses dari server aplikasi.

---

## 3. Profil & Voucher

**Profil** menentukan paket (durasi, harga, profil hotspot MikroTik).

- **Buat profil:** menu **Profil → Tambah** — isi nama, durasi, harga, dan nama
  profil hotspot di MikroTik.

**Membuat voucher:**

1. Menu **Voucher → Generate**.
2. Pilih **Profil** dan **jumlah** voucher.
3. Klik **Generate**. Voucher dibuat di aplikasi dan otomatis didorong ke
   MikroTik.
4. Cetak/booklet voucher dari daftar voucher.

> Batas jumlah voucher per bulan mengikuti paket langganan Anda.

---

## 4. Reseller

- **Tambah reseller:** menu **Reseller → Tambah** — buat akun, tetapkan profil
  yang boleh dijual, dan isi saldo (wallet) bila perlu.
- Reseller login dengan **Kode Tenant + email + password** mereka sendiri, dan
  hanya dapat melihat serta menjual voucher miliknya.

---

## 5. Membayar Langganan (Transfer Manual)

Langganan ditagih lewat **invoice** dan dibayar via transfer bank, lalu
diverifikasi oleh penyedia layanan.

1. Menu **Tagihan/Invoice** — invoice berstatus **PENDING** perlu dibayar.
2. Lihat **nominal** dan **rekening tujuan** pada detail invoice.
3. Lakukan transfer sesuai nominal.
4. Klik **Upload Bukti Transfer**:
   - Pilih file bukti (**JPG, PNG, atau PDF**, maksimal **2 MB**).
   - Tambahkan catatan bila perlu, lalu kirim.
5. Status invoice berubah menjadi **AWAITING_VERIFICATION** (menunggu verifikasi).
6. Setelah penyedia memverifikasi:
   - **Disetujui** → invoice **PAID**, masa langganan diperpanjang otomatis.
   - **Ditolak** → invoice kembali **PENDING** dengan alasan; silakan upload
     ulang bukti yang benar.

> Bukti hanya bisa diunggah untuk invoice milik tenant Anda sendiri.

---

## 6. Status Trial & Langganan

- **Masa Trial:** akun baru biasanya mendapat trial (mis. 14 hari). Sisa hari
  trial tampil di dashboard.
- Jika trial **habis** dan belum berlangganan, akun **otomatis di-suspend** dan
  login diblokir sampai pembayaran diverifikasi.
- Setelah berlangganan, **tanggal berakhir langganan** tampil di dashboard.
  Invoice perpanjangan dibuat otomatis menjelang jatuh tempo (H-7).

Jika akun ter-suspend, selesaikan pembayaran invoice; akun aktif kembali setelah
penyedia memverifikasi pembayaran.

---

## Butuh bantuan?

Hubungi penyedia layanan (Super Admin) Anda untuk: reset password, perpanjangan
trial, perubahan paket, atau kendala verifikasi pembayaran.
