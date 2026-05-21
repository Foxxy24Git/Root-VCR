# Root.VCR — Multi-Tenant Architecture PRD

**Version:** 2.1 (Multi-Tenant Extension — Revised)
**Date:** 2026
**Status:** Planning
**Author:** Fx
**Document Type:** Product Requirements Document — Extension

**Changelog v2.1:**
- MikroTik config: Tenant Admin sekarang dapat akses edit config MikroTik sendiri (bukan hanya Super Admin)
- Free trial 14 hari untuk customer baru
- Payment gateway: manual transfer only (auto-billing & gateway integration ditunda)

---

## 1. Executive Summary

Root.VCR akan dikembangkan dari aplikasi **single-tenant** (1 deploy = 1 pemilik usaha) menjadi **multi-tenant SaaS** (1 deploy = banyak customer). Setiap customer (pemilik RT/RW Net lain) dapat menyewa aplikasi ini dengan MikroTik mereka sendiri, dan dikelola oleh Super Admin (owner aplikasi).

### 1.1 Business Goal

- Menjual akses aplikasi Root.VCR sebagai SaaS ke pemilik RT/RW Net lain
- 1 kali deploy di Proxmox, melayani banyak customer
- Recurring revenue dari subscription
- Persiapan ekspansi ke aplikasi mobile (Flutter) yang akan dipublish ke Play Store

### 1.2 Target Pengguna

| Role | Deskripsi | Akses |
|------|-----------|-------|
| **Super Admin** | Owner aplikasi (Fx) | Full control: semua tenant, billing, sistem, override MikroTik config |
| **Tenant Admin** | Customer (pemilik RT/RW Net lain) | Kelola reseller & voucher di tenant-nya saja, **kelola MikroTik config sendiri** |
| **Reseller** | Agen penjual voucher | Generate & jual voucher (sama seperti sebelumnya) |
| **End User** | Pelanggan internet | Pakai voucher untuk login WiFi (tidak akses app) |

---

## 2. Arsitektur Multi-Tenant

### 2.1 Pendekatan: Shared Database, Shared Schema

Semua tenant berbagi 1 database dan 1 schema, dipisahkan dengan kolom `tenant_id`. Pendekatan ini dipilih karena:

- ✅ Maintenance mudah (1 database)
- ✅ Resource efisien
- ✅ Cocok untuk skala awal (< 100 tenant)
- ✅ Mudah di-deploy ulang & backup
- ⚠️ Wajib disiplin filter `tenant_id` di setiap query (data isolation)

### 2.2 Hierarki Role

```
Super Admin (Fx)
    │
    ├── Tenant A (Customer A)
    │       ├── Tenant Admin A
    │       └── Reseller A1, A2, A3...
    │
    ├── Tenant B (Customer B)
    │       ├── Tenant Admin B
    │       └── Reseller B1, B2...
    │
    └── Tenant C (Customer C)
            ├── Tenant Admin C
            └── Reseller C1...
```

### 2.3 Strategi Routing & Login

**Fase 1 (MVP):** Login dengan kode tenant
```
URL: rootvcr.com/login
Form: [Kode Tenant] [Username] [Password]
```

**Fase 2 (Upgrade):** Subdomain
```
URL: customera.rootvcr.com/login
URL: customerb.rootvcr.com/login
```

Super Admin punya URL khusus:
```
URL: rootvcr.com/super-admin/login
```

---

## 3. Database Schema Changes

### 3.1 Tabel Baru: `tenants`

```prisma
model Tenant {
  id                    String    @id @default(cuid())
  name                  String                    // "WiFi Cepat Jaya"
  slug                  String    @unique          // "wificepatjaya"
  ownerName             String                    // PIC customer
  ownerEmail            String
  ownerPhone            String

  // MikroTik Configuration (encrypted) — editable oleh Super Admin DAN Tenant Admin
  mikrotikHost          String                    // IP / hostname
  mikrotikPort          Int       @default(8728)
  mikrotikUsername      String
  mikrotikPasswordEnc   String                    // encrypted with app key
  mikrotikUseSSL        Boolean   @default(false)
  mikrotikLastTestAt    DateTime?
  mikrotikLastTestOk    Boolean?
  mikrotikLastEditedBy  String?                   // user id terakhir yang edit
  mikrotikLastEditedAt  DateTime?

  // Subscription & Trial
  planId                String?
  plan                  Plan?     @relation(fields: [planId], references: [id])
  isTrial               Boolean   @default(true)  // default trial saat tenant baru dibuat
  trialEndAt            DateTime?                 // 14 hari dari createdAt
  subscriptionStartAt   DateTime?                 // diset saat trial → paid
  subscriptionEndAt     DateTime?
  isActive              Boolean   @default(true)
  suspendedReason       String?

  // Limits (override dari plan jika perlu)
  maxResellers          Int       @default(5)
  maxVouchersPerMonth   Int       @default(1000)

  // Branding (opsional, untuk white-label)
  logoUrl               String?
  brandColor            String?

  // Audit
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  createdBy             String                    // Super Admin user id

  // Relations
  users                 User[]
  resellers             Reseller[]
  vouchers              Voucher[]
  voucherProfiles       VoucherProfile[]
  transactions          Transaction[]
  auditLogs             AuditLog[]

  @@index([slug])
  @@index([isActive])
  @@index([isTrial])
  @@index([trialEndAt])
}
```

### 3.2 Tabel Baru: `plans`

```prisma
model Plan {
  id                    String    @id @default(cuid())
  name                  String                    // "Trial", "Basic", "Pro", "Enterprise"
  description           String?
  price                 Decimal                   // harga per bulan (0 untuk trial)
  durationDays          Int       @default(30)
  isTrial               Boolean   @default(false) // true = ini plan trial gratis

  maxResellers          Int
  maxVouchersPerMonth   Int
  features              Json                      // ["whatsapp_notif", "branding", ...]

  isActive              Boolean   @default(true)
  createdAt             DateTime  @default(now())

  tenants               Tenant[]
}
```

**Plan default yang akan di-seed:**

| Plan | isTrial | Price | Duration | Max Reseller | Max Voucher/bulan |
|------|---------|-------|----------|--------------|-------------------|
| Trial | true | 0 | 14 hari | 2 | 100 |
| Basic | false | 99.000 | 30 hari | 3 | 1.000 |
| Pro | false | 199.000 | 30 hari | 10 | 5.000 |
| Enterprise | false | 399.000 | 30 hari | Unlimited | Unlimited |

### 3.3 Tabel Baru: `subscription_invoices`

```prisma
model SubscriptionInvoice {
  id              String    @id @default(cuid())
  tenantId        String
  tenant          Tenant    @relation(fields: [tenantId], references: [id])

  invoiceNumber   String    @unique
  amount          Decimal
  periodStart     DateTime
  periodEnd       DateTime
  status          InvoiceStatus              // PENDING, PAID, OVERDUE, CANCELLED

  // Manual Transfer Fields
  paidAt          DateTime?
  paymentMethod   String?                    // "BCA Transfer", "Mandiri Transfer", "Cash", dll
  paymentProof    String?                    // URL bukti transfer (uploaded image)
  paymentNotes    String?                    // catatan dari customer saat upload bukti
  verifiedBy      String?                    // Super Admin user id yang verifikasi
  verifiedAt      DateTime?
  rejectedReason  String?                    // alasan jika bukti ditolak

  notes           String?                    // internal notes
  createdAt       DateTime  @default(now())

  @@index([tenantId])
  @@index([status])
}

enum InvoiceStatus {
  PENDING            // belum dibayar
  AWAITING_VERIFICATION  // customer sudah upload bukti, menunggu verifikasi Super Admin
  PAID               // sudah diverifikasi & lunas
  OVERDUE            // lewat jatuh tempo
  CANCELLED
}
```

**Flow pembayaran manual transfer:**

```
1. Sistem auto-generate invoice → status PENDING
2. Customer (Tenant Admin) lihat invoice di dashboard mereka
3. Customer transfer manual ke rekening yang tertera
4. Customer upload bukti transfer di app → status AWAITING_VERIFICATION
5. Super Admin verifikasi bukti:
   - Setuju → status PAID, subscription extended
   - Tolak → status PENDING lagi + alasan ditampilkan ke customer
```

### 3.8 Modifikasi Tabel Existing

Tambahkan kolom `tenantId` ke semua tabel berikut:

```prisma
model User {
  // ... existing fields
  tenantId    String?                       // null untuk Super Admin
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])
  role        Role                          // SUPER_ADMIN, TENANT_ADMIN, RESELLER
  @@index([tenantId])
}

model Reseller {
  // ... existing fields
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  @@index([tenantId])
}

model Voucher {
  // ... existing fields
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  @@index([tenantId])
}

model VoucherProfile {
  // ... existing fields
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  @@index([tenantId])
}

model Transaction {
  // ... existing fields
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  @@index([tenantId])
}

enum Role {
  SUPER_ADMIN
  TENANT_ADMIN
  RESELLER
}
```

### 3.6 Tabel Baru: `bank_accounts`

Rekening tujuan transfer yang ditampilkan ke customer saat ingin bayar invoice:

```prisma
model BankAccount {
  id              String    @id @default(cuid())
  bankName        String                    // "BCA", "Mandiri", "BRI", "Dana", dll
  accountNumber   String                    // nomor rekening / nomor e-wallet
  accountHolder   String                    // nama pemilik rekening
  notes           String?                   // catatan opsional
  isActive        Boolean   @default(true)
  displayOrder    Int       @default(0)     // urutan tampil

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### 3.7 Tabel Baru: `audit_logs`

```prisma
model AuditLog {
  id          String    @id @default(cuid())
  tenantId    String?
  tenant      Tenant?   @relation(fields: [tenantId], references: [id])
  userId      String?
  action      String                       // "tenant.created", "voucher.generated", dll
  resource    String?                      // "tenant:xyz", "voucher:abc"
  metadata    Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime  @default(now())

  @@index([tenantId])
  @@index([userId])
  @@index([createdAt])
}
```

---

## 4. Fitur Super Admin

### 4.1 Dashboard Super Admin

**Halaman utama menampilkan:**
- Total tenant aktif vs suspended
- Total voucher terjual (semua tenant) hari ini / bulan ini
- Total revenue subscription bulan ini
- Tenant yang akan expire dalam 7 hari (alert)
- Tenant yang MikroTik-nya offline (alert)
- Grafik pertumbuhan tenant (30 hari)
- Grafik revenue (12 bulan)

### 4.2 Manajemen Tenant

**Halaman List Tenant:**
- Tabel dengan kolom: Nama, Slug, Plan, Status, MikroTik Status, Expire, Actions
- Filter: Active/Suspended/Expired, Plan
- Search by name/slug
- Bulk actions: suspend, activate

**Halaman Detail Tenant:**
- Info dasar (nama, owner, contact)
- MikroTik config (host, port, test connection button)
- Subscription info (plan, periode, sisa hari)
- Stats: jumlah reseller, voucher generated, revenue
- Daftar reseller di tenant ini
- Riwayat invoice
- Action: suspend, extend subscription, change plan, delete

**Form Tambah/Edit Tenant:**
- Input data customer
- Pilih plan
- Set MikroTik credential (akan di-encrypt)
- Test koneksi MikroTik (button)
- Set initial Tenant Admin (username + password)

### 4.3 Manajemen Plan

- CRUD paket subscription
- Set harga, durasi, limit (max reseller, max voucher/bulan)
- Toggle aktif/non-aktif plan

### 4.4 Manajemen Subscription & Billing

**Trial Management (BARU):**
- Saat create tenant baru, default `isTrial = true`, `trialEndAt = createdAt + 14 hari`
- Setelah trial habis: tenant auto-suspend, customer wajib bayar untuk lanjut
- Super Admin bisa extend trial manual (misal beri perpanjangan 7 hari lagi sebagai goodwill)

**Invoice Management:**
- List semua invoice (filter by status, tenant, periode)
- **Verifikasi bukti transfer** (BARU): lihat bukti transfer yang di-upload customer
  - Setuju → status PAID, auto-extend subscription
  - Tolak → status PENDING + input alasan
- Generate invoice manual
- Auto-generate invoice H-7 sebelum subscription habis (untuk tenant non-trial)
- Notifikasi expire (email/WhatsApp) — H-7, H-3, H-1, H+1

**Bank Account Management (BARU):**
- CRUD rekening tujuan transfer (BCA, Mandiri, BRI, e-wallet)
- Toggle aktif/non-aktif rekening
- Atur urutan tampil di halaman pembayaran customer

### 4.5 Monitoring Global

- Status MikroTik semua tenant (online/offline)
- Real-time activity feed
- Top tenant by voucher sales
- Audit log viewer (filter by tenant, user, action, periode)

### 4.6 Pengaturan Sistem

- Konfigurasi SMTP (untuk notifikasi email)
- Konfigurasi WhatsApp Gateway
- Encryption key management
- Backup & restore

---

## 5. Fitur Tenant Admin

Tenant Admin = role admin lama, ditambah beberapa fitur baru terkait self-service:

### 5.1 Dashboard Tenant
- Stats hanya untuk tenant ini (jumlah reseller, voucher terjual, revenue)
- Status koneksi MikroTik real-time
- Info subscription: plan saat ini, sisa hari, status trial/aktif
- Alert: trial akan habis H-3, invoice belum dibayar

### 5.2 Manajemen Reseller & Voucher
- CRUD reseller, top-up saldo (sama seperti versi lama)
- Manajemen voucher profile
- Riwayat transaksi
- Laporan

### 5.3 ⭐ Pengaturan MikroTik (BARU)
**Tenant Admin dapat mengelola config MikroTik mereka sendiri:**
- Lihat & edit config: host/IP, port API, username, password, SSL toggle
- Tombol "Test Koneksi" sebelum save
- History perubahan config (tampilkan dari audit log)
- Validasi: jika test koneksi gagal, beri warning tapi tetap allow save (kadang MikroTik down sementara)
- Password lama tidak ditampilkan, hanya bisa input password baru

**Security note:**
- Password tetap di-encrypt dengan key sistem
- Setiap perubahan dicatat di `audit_log` (siapa, kapan, dari IP mana)
- Super Admin tetap bisa override config jika customer butuh bantuan

### 5.4 ⭐ Subscription & Pembayaran (BARU)
- Lihat invoice yang harus dibayar
- Lihat daftar rekening tujuan transfer (dari `BankAccount`)
- Upload bukti transfer (image upload, max 2MB)
- Tracking status: PENDING → AWAITING_VERIFICATION → PAID
- Riwayat pembayaran
- Notifikasi: invoice baru, bukti diterima, bukti ditolak (dengan alasan)

### 5.5 Profile & Branding
- Edit info bisnis (nama, kontak)
- Upload logo (opsional, untuk fitur branding di plan Pro/Enterprise)
- Set warna brand (opsional)

### 5.6 Pembatasan
**Tenant Admin TIDAK BISA:**
- Akses data tenant lain
- Akses Super Admin area
- Ubah plan sendiri (harus request ke Super Admin)
- Lihat invoice/data tenant lain

---

## 6. Fitur Reseller

Tidak berubah dari versi sebelumnya, namun semua query dibatasi `tenant_id` reseller tersebut.

---

## 7. Security & Data Isolation

### 7.1 Middleware Tenant Isolation

Setiap request setelah login wajib lewat middleware:

```typescript
// pseudocode
async function tenantMiddleware(req) {
  const session = await getSession(req);

  if (session.role === 'SUPER_ADMIN') {
    // Super admin bisa akses semua tenant
    req.tenantId = req.query.tenantId || null;
  } else {
    // Force tenant_id dari session, ignore input user
    req.tenantId = session.tenantId;
    if (!req.tenantId) throw new ForbiddenError();
  }
}
```

### 7.2 Prisma Query Helper

Buat helper agar developer tidak lupa filter `tenantId`:

```typescript
function tenantScopedPrisma(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        // ... findFirst, update, delete, dll
      }
    }
  });
}
```

### 7.3 MikroTik Credential Encryption

- Password MikroTik di-encrypt dengan AES-256 sebelum disimpan
- Key encryption disimpan di environment variable, **tidak di database**
- Decrypt hanya saat akan konek ke MikroTik

### 7.4 Connection Pool MikroTik per Tenant

```typescript
// Cache koneksi MikroTik per tenant (in-memory dengan TTL)
const mikrotikPool = new Map<string, RouterOSClient>();

async function getMikrotikClient(tenantId: string) {
  if (mikrotikPool.has(tenantId)) return mikrotikPool.get(tenantId);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const password = decrypt(tenant.mikrotikPasswordEnc);
  const client = new RouterOSClient({
    host: tenant.mikrotikHost,
    port: tenant.mikrotikPort,
    user: tenant.mikrotikUsername,
    password,
  });

  await client.connect();
  mikrotikPool.set(tenantId, client);
  return client;
}
```

### 7.5 Rate Limiting

- Per tenant: max 1000 request/menit
- Per user: max 100 request/menit
- Login: max 5 attempt/menit per IP

---

## 8. API Endpoints (Tambahan)

### 8.1 Super Admin API

```
GET    /api/super-admin/dashboard
GET    /api/super-admin/tenants
POST   /api/super-admin/tenants                          (default trial 14 hari)
GET    /api/super-admin/tenants/:id
PATCH  /api/super-admin/tenants/:id
DELETE /api/super-admin/tenants/:id
POST   /api/super-admin/tenants/:id/test-mikrotik
POST   /api/super-admin/tenants/:id/suspend
POST   /api/super-admin/tenants/:id/activate
POST   /api/super-admin/tenants/:id/extend
POST   /api/super-admin/tenants/:id/extend-trial          (BARU)
POST   /api/super-admin/tenants/:id/convert-from-trial    (BARU - trial → paid)

GET    /api/super-admin/plans
POST   /api/super-admin/plans
PATCH  /api/super-admin/plans/:id
DELETE /api/super-admin/plans/:id

GET    /api/super-admin/invoices
POST   /api/super-admin/invoices
GET    /api/super-admin/invoices/:id
POST   /api/super-admin/invoices/:id/verify-payment       (BARU - approve bukti)
POST   /api/super-admin/invoices/:id/reject-payment       (BARU - tolak bukti)

GET    /api/super-admin/bank-accounts                     (BARU)
POST   /api/super-admin/bank-accounts                     (BARU)
PATCH  /api/super-admin/bank-accounts/:id                 (BARU)
DELETE /api/super-admin/bank-accounts/:id                 (BARU)

GET    /api/super-admin/audit-logs
```

### 8.2 Tenant Admin API (BARU)

```
GET    /api/tenant-admin/dashboard
GET    /api/tenant-admin/profile
PATCH  /api/tenant-admin/profile

# MikroTik self-service
GET    /api/tenant-admin/mikrotik                        (get current config, password tidak ditampilkan)
PATCH  /api/tenant-admin/mikrotik                        (update config sendiri)
POST   /api/tenant-admin/mikrotik/test                   (test koneksi)

# Subscription & Payment
GET    /api/tenant-admin/subscription                    (status trial/aktif, sisa hari)
GET    /api/tenant-admin/invoices                        (list invoice tenant ini)
GET    /api/tenant-admin/invoices/:id
POST   /api/tenant-admin/invoices/:id/upload-proof       (upload bukti transfer)
GET    /api/tenant-admin/bank-accounts                   (list rekening tujuan transfer aktif)

# Existing reseller/voucher endpoints (sudah ada, di-scope per tenant)
GET    /api/tenant-admin/resellers
POST   /api/tenant-admin/resellers
... (dll)
```

### 8.3 API untuk Flutter (Future)

Endpoint mobile akan pakai prefix `/api/mobile/v1/`:

```
POST   /api/mobile/v1/auth/login
POST   /api/mobile/v1/auth/refresh
GET    /api/mobile/v1/profile
GET    /api/mobile/v1/dashboard
GET    /api/mobile/v1/vouchers
POST   /api/mobile/v1/vouchers/generate
GET    /api/mobile/v1/transactions
```

Semua endpoint mobile pakai **JWT token** (bukan session cookie).

---

## 9. Roadmap Implementasi

| Phase | Durasi Estimasi | Deliverable |
|-------|----------------|-------------|
| **Phase 0** | Selesai | App single-tenant existing |
| **Phase 1** | 1 minggu | Database migration: tambah tabel tenants, plans, bank_accounts, tenantId ke semua tabel |
| **Phase 2** | 1 minggu | Refactor auth & middleware untuk multi-tenant |
| **Phase 3** | 1 minggu | Refactor semua existing API untuk filter tenant + dynamic MikroTik connection |
| **Phase 4** | 2 minggu | Super Admin Dashboard & Tenant Management |
| **Phase 5** | 1 minggu | Plan Management + Trial System (14 hari) |
| **Phase 6** | 1.5 minggu | Manual Payment System (bank accounts, invoice, upload bukti, verifikasi) |
| **Phase 7** | 1 minggu | Tenant Admin self-service (MikroTik config + payment upload UI) |
| **Phase 8** | 1 minggu | Audit Log & Monitoring |
| **Phase 9** | 1 minggu | Testing, security audit, deployment |
| **Phase 10** | 3-4 minggu | Flutter Mobile App (Reseller) |
| **Phase 11** | 1 minggu | Play Store publishing & marketing prep |

**Total: ~14-15 minggu**

---

## 10. Migration Strategy (dari Single-Tenant ke Multi-Tenant)

Karena app sudah jalan single-tenant, perlu strategi migrasi:

1. **Backup database** existing
2. Buat migration yang:
   - Tambah tabel `tenants`, `plans`, `subscription_invoices`, `audit_logs`
   - Tambah kolom `tenantId` (nullable dulu) ke semua tabel
   - Buat 1 tenant default ("Tenant Awal")
   - Update semua data existing dengan `tenantId` tenant default
   - Set `tenantId` jadi NOT NULL setelah data terisi
3. Update kode untuk filter tenant
4. Buat user Super Admin baru
5. Convert admin lama jadi Tenant Admin tenant default

---

## 11. Non-Functional Requirements

### 11.1 Performance
- Login response: < 500ms
- API response (read): < 300ms
- Generate voucher batch (100 voucher): < 5 detik

### 11.2 Scalability
- Target awal: 50 tenant, 500 reseller, 100k voucher/bulan
- Database: PostgreSQL dengan proper indexing
- Caching: Redis untuk session & rate limit (opsional di Phase 7)

### 11.3 Availability
- Target uptime: 99% (downtime ~7 jam/bulan, acceptable untuk SaaS skala kecil)
- Backup: harian otomatis, retention 30 hari

### 11.4 Security
- HTTPS wajib (Let's Encrypt)
- Password hash: bcrypt (cost 12)
- MikroTik password: AES-256 encryption
- JWT untuk mobile, secure HttpOnly cookie untuk web
- CSRF protection
- SQL injection protection (Prisma handle ini)
- Rate limiting

---

## 12. Risks & Mitigation

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Data leak antar tenant | Critical | Middleware wajib + unit test untuk tiap query |
| MikroTik customer berbeda-beda versi | High | Test compatibility, dokumentasi requirement minimum RouterOS |
| Customer lupa bayar | Medium | Auto-suspend + notifikasi H-7, H-3, H-1 |
| Server overload | Medium | Rate limit + monitoring + scaling plan |
| Encryption key bocor | Critical | Key di env var, rotate berkala, audit log akses |

---

## 13. Success Metrics

- 10 tenant aktif dalam 3 bulan pertama setelah launch
- < 5% churn rate per bulan
- Customer NPS > 7
- Zero data leak incident
- Uptime > 99%

---

## 14. Pricing Strategy (Draft)

| Plan | Harga/bulan | Durasi | Max Reseller | Max Voucher/bulan | Fitur |
|------|------------|--------|--------------|-------------------|-------|
| **Trial** | Gratis | 14 hari | 2 | 100 | Core features (limited) |
| **Basic** | Rp 99.000 | 30 hari | 3 | 1.000 | Core features |
| **Pro** | Rp 199.000 | 30 hari | 10 | 5.000 | + Branding, + WhatsApp notif |
| **Enterprise** | Rp 399.000 | 30 hari | Unlimited | Unlimited | + Priority support, + Custom domain |

**Trial Policy:**
- Setiap customer baru otomatis dapat **trial 14 hari gratis**
- Tidak perlu input metode pembayaran saat daftar trial
- H-3 sebelum trial habis: notifikasi ke customer
- H-1: warning di dashboard
- H+0: tenant auto-suspend, customer wajib pilih plan & bayar untuk lanjut
- Super Admin bisa extend trial manual (kasus per kasus)

**Payment Method (saat ini):**
- Manual transfer bank (BCA, Mandiri, BRI, dll)
- Manual transfer e-wallet (Dana, OVO, GoPay)
- Customer upload bukti transfer di app → Super Admin verifikasi → invoice PAID
- *Auto payment gateway (Midtrans/Xendit) akan ditambahkan di fase berikutnya*

*Harga bisa disesuaikan berdasarkan riset market.*

---

## 15. Decisions Log & Open Questions

### Sudah Diputuskan ✅
- ✅ **MikroTik config:** Super Admin DAN Tenant Admin sama-sama bisa edit. Tenant Admin self-service untuk credential mereka sendiri.
- ✅ **Trial:** 14 hari gratis untuk semua customer baru. Auto-suspend setelah trial habis.
- ✅ **Payment Gateway:** Manual transfer only (BCA, Mandiri, BRI, e-wallet). Customer upload bukti → Super Admin verifikasi. Integrasi payment gateway otomatis ditunda ke fase berikutnya.

### Masih Open ❓
- [ ] Bagaimana handle jika MikroTik customer offline saat generate voucher? Queue atau langsung error?
- [ ] White-label: apakah customer boleh pakai domain sendiri (custom domain)?
- [ ] Notifikasi: pakai email saja, atau langsung integrate WhatsApp Gateway dari awal?
- [ ] Backup database: harian otomatis ke storage mana (lokal Proxmox, S3, Google Drive)?

---

**Dokumen ini akan terus diupdate seiring development. Versi final akan jadi referensi utama untuk Claude Code sessions.**
