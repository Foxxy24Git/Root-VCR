# Product Requirements Document (PRD)
# Root.VCR - Sistem Manajemen Voucher RT/RW Net

---

## 📋 Document Information

| Item | Detail |
|------|--------|
| **Nama Produk** | Root.VCR |
| **Versi Dokumen** | 1.0 |
| **Tanggal** | April 2026 |
| **Tipe Aplikasi** | Full-Stack Web Application |
| **Target Platform** | Self-hosted (Proxmox VM) |

---

## 1. Executive Summary

### 1.1 Latar Belakang
Root.VCR adalah aplikasi manajemen voucher untuk usaha RT/RW Net yang terintegrasi langsung dengan MikroTik RouterOS melalui API port 8728. Aplikasi ini memungkinkan pengelolaan voucher hotspot dengan sistem reseller yang dilengkapi fitur wallet/saldo.

### 1.2 Tujuan Produk
- Mengotomasi proses generate dan distribusi voucher hotspot
- Menyediakan sistem reseller dengan manajemen saldo
- Memberikan monitoring real-time terhadap penggunaan voucher
- Menghasilkan laporan keuangan dan analitik yang komprehensif

### 1.3 Target Pengguna
1. **Super Admin** - Pemilik usaha RT/RW Net (full access)
2. **Reseller** - Agen penjual voucher (limited access)

---

## 2. Technical Architecture

### 2.1 Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        TECH STACK                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FRONTEND                                                       │
│  ├── Framework    : Next.js 14 (App Router)                    │
│  ├── Language     : TypeScript                                  │
│  ├── Styling      : Tailwind CSS                               │
│  ├── UI Library   : shadcn/ui                                  │
│  ├── Charts       : Recharts / Chart.js                        │
│  ├── State        : Zustand / React Query                      │
│  └── Icons        : Lucide React                               │
│                                                                 │
│  BACKEND                                                        │
│  ├── Runtime      : Node.js 20 LTS                             │
│  ├── Framework    : Next.js API Routes                         │
│  ├── ORM          : Prisma                                      │
│  ├── Auth         : NextAuth.js v5                             │
│  ├── Validation   : Zod                                        │
│  └── MikroTik     : routeros-client                            │
│                                                                 │
│  DATABASE                                                       │
│  ├── Primary      : PostgreSQL 16                              │
│  ├── Cache        : Redis (optional, untuk real-time)          │
│  └── Backup       : pg_dump scheduled (cron)                   │
│                                                                 │
│  INFRASTRUCTURE                                                 │
│  ├── Host         : Proxmox VM (Ubuntu 22.04 LTS)              │
│  ├── Process Mgr  : PM2                                        │
│  ├── Reverse Proxy: Nginx (optional)                           │
│  └── SSL          : Let's Encrypt (optional)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────┐         ┌─────────────────────────────────────────┐     │
│    │   Browser   │         │            PROXMOX HOST                 │     │
│    │  ─────────  │         │  ┌─────────────────────────────────┐   │     │
│    │ Admin Panel │   HTTP  │  │           VM: Root.VCR          │   │     │
│    │ Reseller    │◄───────►│  │  ┌─────────┐    ┌───────────┐   │   │     │
│    │   Panel     │  :3000  │  │  │ Next.js │◄──►│ PostgreSQL│   │   │     │
│    └─────────────┘         │  │  │   App   │    │  Database │   │   │     │
│                            │  │  └────┬────┘    └───────────┘   │   │     │
│                            │  │       │                          │   │     │
│                            │  │       │ API :8728                │   │     │
│                            │  │       ▼                          │   │     │
│                            │  │  ┌─────────┐                     │   │     │
│                            │  │  │MikroTik │ (via VPN Tunnel)    │   │     │
│                            │  │  │ Router  │                     │   │     │
│                            │  │  └─────────┘                     │   │     │
│                            │  └─────────────────────────────────┘   │     │
│                            └─────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 MikroTik Connection

```javascript
// Environment Variables (.env)
MIKROTIK_HOST=id-11.tunnel.web.id
MIKROTIK_PORT=6904
MIKROTIK_API_PORT=8728
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=K@nd@ngkud0
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐       ┌──────────────────┐       ┌─────────────────┐ │
│  │      users       │       │    vouchers      │       │   profiles      │ │
│  │ ──────────────── │       │ ──────────────── │       │ ─────────────── │ │
│  │ id (PK)          │       │ id (PK)          │       │ id (PK)         │ │
│  │ email            │       │ code             │       │ name            │ │
│  │ password_hash    │       │ user_id (FK)     │       │ duration_days   │ │
│  │ name             │       │ profile_id (FK)  │       │ price           │ │
│  │ role (enum)      │◄──────│ status (enum)    │──────►│ speed_limit     │ │
│  │ phone            │       │ generated_at     │       │ mikrotik_profile│ │
│  │ location         │       │ used_at          │       │ is_active       │ │
│  │ avatar_url       │       │ expired_at       │       │ created_at      │ │
│  │ is_active        │       │ client_ip        │       └─────────────────┘ │
│  │ is_frozen        │       │ client_mac       │                           │
│  │ fee_percentage   │       │ created_at       │       ┌─────────────────┐ │
│  │ created_at       │       └──────────────────┘       │ wallet_logs     │ │
│  │ updated_at       │                                  │ ─────────────── │ │
│  └────────┬─────────┘       ┌──────────────────┐       │ id (PK)         │ │
│           │                 │     wallets      │       │ wallet_id (FK)  │ │
│           │                 │ ──────────────── │       │ type (enum)     │ │
│           └────────────────►│ id (PK)          │◄──────│ amount          │ │
│                             │ user_id (FK)     │       │ balance_before  │ │
│                             │ balance          │       │ balance_after   │ │
│                             │ total_topup      │       │ description     │ │
│                             │ total_spent      │       │ reference_id    │ │
│                             │ updated_at       │       │ created_at      │ │
│                             └──────────────────┘       └─────────────────┘ │
│                                                                             │
│  ┌──────────────────┐       ┌──────────────────┐       ┌─────────────────┐ │
│  │ reseller_profiles│       │     settings     │       │   pppoe_users   │ │
│  │ ──────────────── │       │ ──────────────── │       │ ─────────────── │ │
│  │ id (PK)          │       │ id (PK)          │       │ id (PK)         │ │
│  │ user_id (FK)     │       │ key              │       │ username        │ │
│  │ profile_id (FK)  │       │ value            │       │ profile         │ │
│  │ is_enabled       │       │ type             │       │ status          │ │
│  │ created_at       │       │ updated_at       │       │ last_seen       │ │
│  └──────────────────┘       └──────────────────┘       │ synced_at       │ │
│                                                        └─────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Table Definitions

#### 3.2.1 Users Table
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'reseller')),
    phone           VARCHAR(20),
    location        VARCHAR(255),
    avatar_url      VARCHAR(500),
    is_active       BOOLEAN DEFAULT true,
    is_frozen       BOOLEAN DEFAULT false,
    fee_percentage  DECIMAL(5,2) DEFAULT 0.00,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.2.2 Profiles Table (Voucher Profiles)
```sql
CREATE TABLE profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    duration_days       INTEGER NOT NULL,
    duration_hours      INTEGER DEFAULT 0,
    price               DECIMAL(12,2) NOT NULL,
    speed_limit         VARCHAR(50),
    mikrotik_profile    VARCHAR(100) NOT NULL,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.2.3 Vouchers Table
```sql
CREATE TABLE vouchers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) UNIQUE NOT NULL,
    user_id         UUID REFERENCES users(id),
    profile_id      UUID REFERENCES profiles(id),
    status          VARCHAR(20) DEFAULT 'unused' 
                    CHECK (status IN ('unused', 'active', 'expired', 'deleted')),
    price_charged   DECIMAL(12,2) NOT NULL,
    generated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at         TIMESTAMP,
    expired_at      TIMESTAMP,
    client_ip       VARCHAR(45),
    client_mac      VARCHAR(17),
    mikrotik_synced BOOLEAN DEFAULT false,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.2.4 Wallets Table
```sql
CREATE TABLE wallets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE REFERENCES users(id),
    balance         DECIMAL(15,2) DEFAULT 0.00,
    total_topup     DECIMAL(15,2) DEFAULT 0.00,
    total_spent     DECIMAL(15,2) DEFAULT 0.00,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.2.5 Wallet Logs Table
```sql
CREATE TABLE wallet_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id       UUID REFERENCES wallets(id),
    type            VARCHAR(20) NOT NULL 
                    CHECK (type IN ('topup', 'deduct', 'generate', 'refund', 'adjustment')),
    amount          DECIMAL(15,2) NOT NULL,
    balance_before  DECIMAL(15,2) NOT NULL,
    balance_after   DECIMAL(15,2) NOT NULL,
    description     TEXT,
    reference_id    UUID,
    admin_id        UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.2.6 Reseller Profiles (Many-to-Many)
```sql
CREATE TABLE reseller_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    profile_id      UUID REFERENCES profiles(id),
    is_enabled      BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, profile_id)
);
```

#### 3.2.7 Settings Table
```sql
CREATE TABLE settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(100) UNIQUE NOT NULL,
    value           TEXT,
    type            VARCHAR(20) DEFAULT 'string',
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Settings
INSERT INTO settings (key, value, type) VALUES
('voucher_code_length', '8', 'number'),
('voucher_code_format', 'alphanumeric_upper', 'string'),
('voucher_prefix', 'VCR-', 'string'),
('voucher_username_equals_password', 'true', 'boolean'),
('hotspot_login_url', 'http://hotspot.local/login', 'string'),
('company_name', 'Root.VCR', 'string'),
('company_logo_url', '/logo.png', 'string'),
('mikrotik_host', '', 'string'),
('mikrotik_port', '8728', 'number'),
('mikrotik_user', '', 'string'),
('mikrotik_password', '', 'encrypted');
```

#### 3.2.8 PPPoE Users Table (Sync from MikroTik)
```sql
CREATE TABLE pppoe_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(100) NOT NULL,
    profile         VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'inactive',
    caller_id       VARCHAR(50),
    last_seen       TIMESTAMP,
    synced_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. API Endpoints

### 4.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/change-password` | Change password |
| GET | `/api/auth/me` | Get current user |

### 4.2 Dashboard

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/dashboard/admin` | Admin dashboard stats | Admin |
| GET | `/api/dashboard/reseller` | Reseller dashboard stats | Reseller |
| GET | `/api/dashboard/top-resellers` | Top reseller ranking | Admin |

### 4.3 Voucher Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/vouchers/generate` | Generate voucher(s) | Both |
| GET | `/api/vouchers` | List vouchers | Both |
| GET | `/api/vouchers/:id` | Get voucher detail | Both |
| DELETE | `/api/vouchers/:id` | Delete voucher | Admin |
| GET | `/api/vouchers/active` | Get active vouchers (real-time) | Both |
| GET | `/api/vouchers/today` | Get today's generated vouchers | Both |
| GET | `/api/vouchers/export` | Export vouchers to PDF/Excel | Both |

### 4.4 Wallet Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/wallets/:userId` | Get wallet balance | Both |
| POST | `/api/wallets/:userId/topup` | Top up wallet | Admin |
| POST | `/api/wallets/:userId/adjust` | Adjust wallet balance | Admin |
| GET | `/api/wallets/:userId/logs` | Get wallet transaction logs | Both |
| GET | `/api/wallets/export` | Export wallet report | Admin |

### 4.5 User Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | List all users | Admin |
| POST | `/api/users` | Create new user/reseller | Admin |
| GET | `/api/users/:id` | Get user detail | Both |
| PUT | `/api/users/:id` | Update user | Both |
| PATCH | `/api/users/:id/freeze` | Freeze/unfreeze user | Admin |
| PATCH | `/api/users/:id/fee` | Set reseller fee percentage | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |

### 4.6 Profile Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/profiles` | List all profiles | Both |
| POST | `/api/profiles` | Create profile | Admin |
| PUT | `/api/profiles/:id` | Update profile | Admin |
| DELETE | `/api/profiles/:id` | Delete profile | Admin |
| POST | `/api/profiles/assign` | Assign profiles to reseller | Admin |
| GET | `/api/profiles/reseller/:userId` | Get reseller's available profiles | Both |

### 4.7 Analytics

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/analytics/vouchers` | Voucher analytics | Both |
| GET | `/api/analytics/revenue` | Revenue analytics | Admin |
| GET | `/api/analytics/reseller/:userId` | Reseller analytics | Both |
| GET | `/api/analytics/profiles` | Profile usage analytics | Admin |

### 4.8 Settings

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/settings` | Get all settings | Admin |
| PUT | `/api/settings` | Update settings | Admin |
| POST | `/api/settings/mikrotik/test` | Test MikroTik connection | Admin |
| POST | `/api/settings/mikrotik/sync` | Sync with MikroTik | Admin |

### 4.9 MikroTik Integration

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/mikrotik/hotspot/users` | Get hotspot users | Admin |
| GET | `/api/mikrotik/hotspot/active` | Get active sessions | Both |
| GET | `/api/mikrotik/hotspot/profiles` | Get hotspot profiles | Admin |
| POST | `/api/mikrotik/hotspot/kick/:mac` | Kick user session | Admin |
| GET | `/api/mikrotik/pppoe/users` | Get PPPoE users | Admin |
| GET | `/api/mikrotik/pppoe/active` | Get active PPPoE | Admin |
| DELETE | `/api/mikrotik/cookies` | Delete all hotspot cookies | Admin |

---

## 5. Feature Specifications

### 5.1 RESELLER PANEL

#### 5.1.1 Dashboard Reseller

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RESELLER DASHBOARD                                           [Avatar] ▼   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   TOTAL SALDO   │  │  VCR GENERATED  │  │  ACTIVE USERS   │            │
│  │                 │  │     TODAY       │  │    (Real-time)  │            │
│  │  Rp 500.000     │  │       15        │  │        8        │            │
│  │  ↑ +Rp 100.000  │  │  ↑ +5 dari kmrn │  │                 │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  GENERATE VOUCHER                                                     │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │  │
│  │  │ Pilih Profile ▼ │  │   Jumlah: [1]   │  │ [GENERATE VOUCHER]  │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │  │
│  │                                                                       │  │
│  │  Profiles Available:                                                  │  │
│  │  ○ 1 Hari - Rp 3.000 (Anda: Rp 2.700)                               │  │
│  │  ○ 3 Hari - Rp 8.000 (Anda: Rp 7.200)                               │  │
│  │  ○ 7 Hari - Rp 15.000 (Anda: Rp 13.500)                             │  │
│  │  ○ 30 Hari - Rp 50.000 (Anda: Rp 45.000)                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  VOUCHER AKTIF HARI INI                              [Refresh] 🔄    │  │
│  │  ┌────────────┬──────────┬────────────┬─────────────┬─────────────┐  │  │
│  │  │ Kode       │ Profile  │ Status     │ Dipakai     │ Expired     │  │  │
│  │  ├────────────┼──────────┼────────────┼─────────────┼─────────────┤  │  │
│  │  │ VCR-A8K2M  │ 1 Hari   │ 🟢 Active  │ 10:30 WIB   │ 11 Apr 2026 │  │  │
│  │  │ VCR-B9L3N  │ 3 Hari   │ 🟡 Unused  │ -           │ -           │  │  │
│  │  │ VCR-C7J4P  │ 7 Hari   │ 🟢 Active  │ 08:15 WIB   │ 17 Apr 2026 │  │  │
│  │  └────────────┴──────────┴────────────┴─────────────┴─────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  RIWAYAT SALDO                                                        │  │
│  │  ┌────────────┬────────────┬─────────────────┬─────────────────────┐ │  │
│  │  │ Waktu      │ Tipe       │ Jumlah          │ Saldo               │ │  │
│  │  ├────────────┼────────────┼─────────────────┼─────────────────────┤ │  │
│  │  │ 10:30 WIB  │ Generate   │ -Rp 2.700       │ Rp 500.000          │ │  │
│  │  │ 09:00 WIB  │ Topup      │ +Rp 100.000     │ Rp 502.700          │ │  │
│  │  │ Kemarin    │ Generate   │ -Rp 7.200       │ Rp 402.700          │ │  │
│  │  └────────────┴────────────┴─────────────────┴─────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.1.2 Generate Voucher - Card Mode

Setelah generate voucher, muncul modal "Card Mode":

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VOUCHER GENERATED!                          [X]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    ┌─────────────────────────────────┐                     │
│                    │                                 │                     │
│                    │         [COMPANY LOGO]          │                     │
│                    │           Root.VCR              │                     │
│                    │                                 │                     │
│                    │    ━━━━━━━━━━━━━━━━━━━━━━━━    │                     │
│                    │                                 │                     │
│                    │         KODE VOUCHER            │                     │
│                    │       ┌───────────────┐         │                     │
│                    │       │  VCR-A8K2M9X  │         │                     │
│                    │       └───────────────┘         │                     │
│                    │                                 │                     │
│                    │    Profile: Paket 1 Hari        │                     │
│                    │    Masa Aktif: 24 Jam           │                     │
│                    │    Expired: 12 April 2026       │                     │
│                    │                                 │                     │
│                    │    ━━━━━━━━━━━━━━━━━━━━━━━━    │                     │
│                    │                                 │                     │
│                    │    Login: hotspot.mynet.id      │                     │
│                    │                                 │                     │
│                    └─────────────────────────────────┘                     │
│                                                                             │
│              ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│              │ 📋 SALIN │  │ BAGIKAN  │  │  CLOSE   │                     │
│              └──────────┘  └────┬─────┘  └──────────┘                     │
│                                 │                                          │
│                    ┌────────────┴────────────┐                             │
│                    │  WhatsApp  │  Telegram  │                             │
│                    │  Messenger │  SMS/Text  │                             │
│                    └─────────────────────────┘                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Format Pesan Share:
━━━━━━━━━━━━━━━━━━━━━━
🎫 VOUCHER WIFI ROOT.VCR
━━━━━━━━━━━━━━━━━━━━━━
Kode: VCR-A8K2M9X
Profile: Paket 1 Hari
Masa Aktif: 24 Jam

📶 Login di: hotspot.mynet.id
━━━━━━━━━━━━━━━━━━━━━━
```

#### 5.1.3 Manajemen Voucher (Reseller)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MANAJEMEN VOUCHER                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Filter: [All Status ▼] [All Profile ▼] [Tanggal: ___] [🔍 Search]        │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Kode      │ Profile │ Generated   │ Used        │ Expired   │ Status  │ │
│  ├───────────┼─────────┼─────────────┼─────────────┼───────────┼─────────┤ │
│  │ VCR-A8K2M │ 1 Hari  │ 10 Apr 10:30│ 10 Apr 11:00│ 11 Apr    │ 🟢 Used │ │
│  │ VCR-B9L3N │ 3 Hari  │ 10 Apr 09:00│ -           │ -         │ 🟡 New  │ │
│  │ VCR-C7J4P │ 7 Hari  │ 09 Apr 15:00│ 09 Apr 16:00│ 16 Apr    │ 🔵 Active│ │
│  │ VCR-D6H5Q │ 1 Hari  │ 08 Apr 08:00│ 08 Apr 09:00│ 09 Apr    │ 🔴 Exp  │ │
│  └───────────┴─────────┴─────────────┴─────────────┴───────────┴─────────┘ │
│                                                                             │
│  [📥 Download PDF]  [📥 Download Excel]                                    │
│                                                                             │
│  Report includes: Kode, Waktu Generate, Waktu Pakai, IP Client,           │
│                   MAC Address, Saldo Terpotong, Status                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.1.4 Menu Analysis (Reseller)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ANALYTICS                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Period: [Hari Ini ▼] [Minggu Ini] [Bulan Ini] [Custom]                   │
│                                                                             │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐   │
│  │  PENGGUNAAN SALDO              │  │  VOUCHER GENERATED             │   │
│  │  ┌──────────────────────────┐  │  │  ┌──────────────────────────┐  │   │
│  │  │    [DONUT CHART]         │  │  │  │    [BAR CHART]           │  │   │
│  │  │    ┌─────┐               │  │  │  │    █ █ █                 │  │   │
│  │  │   /       \   Terpakai   │  │  │  │    █ █ █ █               │  │   │
│  │  │  │  75%   │   Rp 375.000 │  │  │  │    █ █ █ █ █             │  │   │
│  │  │   \      /    ─────────  │  │  │  │   ─────────────          │  │   │
│  │  │    └─────┘    Sisa       │  │  │  │   Sen Sel Rab Kam Jum    │  │   │
│  │  │               Rp 125.000 │  │  │  │                          │  │   │
│  │  └──────────────────────────┘  │  │  └──────────────────────────┘  │   │
│  └────────────────────────────────┘  └────────────────────────────────┘   │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │  TREND GENERATE VOUCHER (7 HARI TERAKHIR)                          │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │                              *                                │  │   │
│  │  │                           *     *                             │  │   │
│  │  │        *     *         *           *                          │  │   │
│  │  │     *     *     *   *                 *                       │  │   │
│  │  │  *                                       *                    │  │   │
│  │  │ ──────────────────────────────────────────────────────────── │  │   │
│  │  │ 5 Apr  6 Apr  7 Apr  8 Apr  9 Apr  10 Apr  11 Apr            │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐   │
│  │  PROFILE TERPOPULER            │  │  STATISTIK                     │   │
│  │  ┌──────────────────────────┐  │  │  ┌──────────────────────────┐  │   │
│  │  │ 1. Paket 1 Hari    45%   │  │  │  │ Total Generate: 150      │  │   │
│  │  │ 2. Paket 3 Hari    30%   │  │  │  │ Aktif Sekarang: 23       │  │   │
│  │  │ 3. Paket 7 Hari    20%   │  │  │  │ Sudah Expired: 100       │  │   │
│  │  │ 4. Paket 30 Hari    5%   │  │  │  │ Belum Dipakai: 27        │  │   │
│  │  └──────────────────────────┘  │  │  └──────────────────────────┘  │   │
│  └────────────────────────────────┘  └────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.1.5 Settings (Reseller)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SETTINGS                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PROFIL                                                              │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │  ┌─────────┐                                                │    │   │
│  │  │  │ [PHOTO] │  [Change Photo]                                │    │   │
│  │  │  └─────────┘                                                │    │   │
│  │  │                                                             │    │   │
│  │  │  Nama        : [John Reseller_______________]               │    │   │
│  │  │  Email       : [john@reseller.com___________] (readonly)    │    │   │
│  │  │  Phone       : [081234567890________________]               │    │   │
│  │  │  Lokasi      : [Samarinda, Kalimantan Timur_]               │    │   │
│  │  │                                                             │    │   │
│  │  │                                        [💾 Save Changes]    │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SECURITY                                                            │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │  Password Lama    : [••••••••••••___________]               │    │   │
│  │  │  Password Baru    : [•••••••••••____________]               │    │   │
│  │  │  Konfirmasi       : [•••••••••••____________]               │    │   │
│  │  │                                                             │    │   │
│  │  │                                      [🔐 Change Password]   │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           [🚪 LOGOUT]                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 ADMIN PANEL

#### 5.2.1 Dashboard Admin

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD                                    🔔 [3]  [Admin] ▼      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│  │VCR TODAY   │ │TOTAL SALDO │ │REVENUE     │ │ RESELLERS  │ │PPPoE     │ │
│  │ (All)      │ │(All Seller)│ │ (Month)    │ │  Active    │ │ Active   │ │
│  │   247      │ │Rp 5.500.000│ │Rp 2.350.000│ │    12/15   │ │  45/60   │ │
│  │ ↑ +45      │ │            │ │ ↑ +15%     │ │            │ │          │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
│                                                                             │
│  ┌───────────────────────────────────┐ ┌───────────────────────────────┐   │
│  │  TOP RESELLER HARI INI            │ │  GENERATE VCR (Admin)         │   │
│  │  ┌─────────────────────────────┐  │ │  ┌───────────────────────┐    │   │
│  │  │ 🥇 John - 50 VCR            │  │ │  │ Profile: [1 Hari ▼]   │    │   │
│  │  │ 🥈 Jane - 42 VCR            │  │ │  │ Jumlah:  [1_________] │    │   │
│  │  │ 🥉 Bob  - 38 VCR            │  │ │  │                       │    │   │
│  │  │ 4. Alice - 25 VCR           │  │ │  │ [🎫 Generate Free]    │    │   │
│  │  │ 5. Charlie - 20 VCR         │  │ │  └───────────────────────┘    │   │
│  │  └─────────────────────────────┘  │ │  (Tanpa potong saldo)         │   │
│  └───────────────────────────────────┘ └───────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  REVENUE CHART                                       [Week ▼]        │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Rp 500k │                                    ▄▄               │  │  │
│  │  │  Rp 400k │              ▄▄        ▄▄        ██               │  │  │
│  │  │  Rp 300k │        ▄▄    ██  ▄▄    ██  ▄▄    ██  ▄▄           │  │  │
│  │  │  Rp 200k │  ▄▄    ██    ██  ██    ██  ██    ██  ██           │  │  │
│  │  │  Rp 100k │  ██    ██    ██  ██    ██  ██    ██  ██           │  │  │
│  │  │         ─┼──────────────────────────────────────────          │  │  │
│  │  │           Sen   Sel   Rab   Kam   Jum   Sab   Ming            │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  RECENT ACTIVITY                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │ 10:30 │ John generated 5 vouchers (Paket 1 Hari)               │  │  │
│  │  │ 10:25 │ Jane wallet topped up Rp 100.000                       │  │  │
│  │  │ 10:20 │ VCR-X8Y9Z activated by 192.168.1.105                   │  │  │
│  │  │ 10:15 │ Bob generated 3 vouchers (Paket 7 Hari)                │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.2 Wallet Management (Admin)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WALLET MANAGEMENT                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🔍 Search Reseller...] [Filter: All ▼]  [📥 Export Report]               │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Reseller     │ Saldo        │ Total Topup   │ Total Spent  │ Action   │  │
│  ├──────────────┼──────────────┼───────────────┼──────────────┼──────────┤  │
│  │ 👤 John      │ Rp 500.000   │ Rp 2.000.000  │ Rp 1.500.000 │ [Manage] │  │
│  │ 👤 Jane      │ Rp 250.000   │ Rp 1.500.000  │ Rp 1.250.000 │ [Manage] │  │
│  │ 👤 Bob       │ Rp 0         │ Rp 500.000    │ Rp 500.000   │ [Manage] │  │
│  │ 👤 Alice     │ Rp 1.200.000 │ Rp 3.000.000  │ Rp 1.800.000 │ [Manage] │  │
│  └──────────────┴──────────────┴───────────────┴──────────────┴──────────┘  │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  TOPUP / ADJUST WALLET                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Reseller    : [Select Reseller ▼_____________]                      │  │
│  │  Current     : Rp 500.000                                            │  │
│  │  Action      : ○ Topup  ○ Deduct  ○ Set Balance                      │  │
│  │  Amount      : [Rp ________________]                                 │  │
│  │  Note        : [________________________________]                    │  │
│  │                                                                      │  │
│  │                                              [💰 Process Transaction]│  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.3 Reseller Management (Admin)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RESELLER MANAGEMENT                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [➕ Add Reseller]  [🔍 Search...]  [Filter: All ▼]                        │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Name   │ Email           │ Fee % │ Saldo      │ Status  │ Actions    │  │
│  ├────────┼─────────────────┼───────┼────────────┼─────────┼────────────┤  │
│  │ John   │ john@mail.com   │ 10%   │ Rp 500.000 │ 🟢 Active│ [⚙️] [❄️] │  │
│  │ Jane   │ jane@mail.com   │ 15%   │ Rp 250.000 │ 🟢 Active│ [⚙️] [❄️] │  │
│  │ Bob    │ bob@mail.com    │ 5%    │ Rp 0       │ 🔴 Frozen│ [⚙️] [🔥] │  │
│  │ Alice  │ alice@mail.com  │ 10%   │ Rp 1.2jt   │ 🟢 Active│ [⚙️] [❄️] │  │
│  └────────┴─────────────────┴───────┴────────────┴─────────┴────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ADD/EDIT RESELLER                                                    │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Name         : [_________________________________]            │  │  │
│  │  │  Email        : [_________________________________]            │  │  │
│  │  │  Password     : [_________________________________]            │  │  │
│  │  │  Phone        : [_________________________________]            │  │  │
│  │  │  Location     : [_________________________________]            │  │  │
│  │  │  Fee %        : [10___] % (Discount dari harga normal)         │  │  │
│  │  │                                                                │  │  │
│  │  │  Profiles     : ☑ Paket 1 Hari  ☑ Paket 3 Hari                │  │  │
│  │  │  Available    : ☑ Paket 7 Hari  ☐ Paket 30 Hari               │  │  │
│  │  │                                                                │  │  │
│  │  │                                              [💾 Save]         │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.4 Voucher Management (Admin)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  VOUCHER MANAGEMENT                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  VOUCHER SETTINGS                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Code Format                                                          │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Prefix        : [VCR-___________]                             │  │  │
│  │  │  Length        : [8____] characters                            │  │  │
│  │  │  Format        : ○ UPPERCASE  ○ lowercase  ● MixedCase         │  │  │
│  │  │  Characters    : ☑ Letters  ☑ Numbers  ☐ Symbols               │  │  │
│  │  │  Username=Pass : ● Yes  ○ No (separate password)               │  │  │
│  │  │                                                                │  │  │
│  │  │  Preview       : VCR-A8k2M9xB                                  │  │  │
│  │  │                                               [💾 Save Config] │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  PROFILE MANAGEMENT                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  [➕ Add Profile]  [🔄 Sync from MikroTik]                           │  │
│  │                                                                      │  │
│  │  ┌────────────┬──────────┬──────────────┬────────────┬────────────┐ │  │
│  │  │ Name       │ Duration │ Price        │ MT Profile │ Actions    │ │  │
│  │  ├────────────┼──────────┼──────────────┼────────────┼────────────┤ │  │
│  │  │ Paket 1H   │ 1 Day    │ Rp 3.000     │ 1day-5mbps │ [✏️] [🗑️] │ │  │
│  │  │ Paket 3H   │ 3 Days   │ Rp 8.000     │ 3day-5mbps │ [✏️] [🗑️] │ │  │
│  │  │ Paket 7H   │ 7 Days   │ Rp 15.000    │ 7day-10mbps│ [✏️] [🗑️] │ │  │
│  │  │ Paket 30H  │ 30 Days  │ Rp 50.000    │ 30day-10mb │ [✏️] [🗑️] │ │  │
│  │  └────────────┴──────────┴──────────────┴────────────┴────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ALL VOUCHERS                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Filter: [All Reseller ▼] [All Status ▼] [All Profile ▼] [Date]     │  │
│  │  [🔍 Search Code...]  [📥 Export All]  [📥 Export Selected]         │  │
│  │                                                                      │  │
│  │  ┌─────────┬─────────┬──────────┬───────────┬──────────┬──────────┐ │  │
│  │  │ Code    │ Reseller│ Profile  │ Generated │ Status   │ IP Client│ │  │
│  │  ├─────────┼─────────┼──────────┼───────────┼──────────┼──────────┤ │  │
│  │  │ VCR-A8K │ John    │ 1 Hari   │ 10/4 10:30│ 🟢 Active│ 192.168..│ │  │
│  │  │ VCR-B9L │ Jane    │ 3 Hari   │ 10/4 09:00│ 🟡 Unused│ -        │ │  │
│  │  │ VCR-C7J │ Admin   │ 7 Hari   │ 09/4 15:00│ 🔵 Active│ 192.168..│ │  │
│  │  └─────────┴─────────┴──────────┴───────────┴──────────┴──────────┘ │  │
│  │                                                                      │  │
│  │  [🗑️ Delete Cookies (All)]  [🗑️ Delete Selected Vouchers]          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  PPPoE MANAGEMENT                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  [🔄 Sync PPPoE Users]                                               │  │
│  │                                                                      │  │
│  │  ┌────────────┬────────────┬──────────┬───────────────┬────────────┐ │  │
│  │  │ Username   │ Profile    │ Status   │ Last Online   │ Actions    │ │  │
│  │  ├────────────┼────────────┼──────────┼───────────────┼────────────┤ │  │
│  │  │ pppoe-001  │ 10mbps     │ 🟢 Online│ Now           │ [👁️] [⚙️] │ │  │
│  │  │ pppoe-002  │ 20mbps     │ 🔴 Offline│ 2 hours ago  │ [👁️] [⚙️] │ │  │
│  │  │ pppoe-003  │ 10mbps     │ 🟢 Online│ Now           │ [👁️] [⚙️] │ │  │
│  │  └────────────┴────────────┴──────────┴───────────────┴────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.5 Analytics (Admin)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ANALYTICS                                          [Export Report 📥]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Period: [Today] [This Week] [This Month] [Custom Range]                   │
│                                                                             │
│  ┌────────────────────────────────┐ ┌──────────────────────────────────┐   │
│  │  TOTAL SALDO (ALL RESELLERS)  │ │  REVENUE TREND                   │   │
│  │  ┌──────────────────────────┐ │ │  ┌────────────────────────────┐  │   │
│  │  │                          │ │ │  │     ╱╲    ╱╲               │  │   │
│  │  │    Rp 5.500.000          │ │ │  │    ╱  ╲  ╱  ╲    ╱╲       │  │   │
│  │  │                          │ │ │  │   ╱    ╲╱    ╲  ╱  ╲      │  │   │
│  │  │  ▓▓▓▓▓▓▓▓░░░░            │ │ │  │  ╱            ╲╱    ╲     │  │   │
│  │  │  68% active balance      │ │ │  │ ╱                    ╲    │  │   │
│  │  │                          │ │ │  │──────────────────────────│  │   │
│  │  └──────────────────────────┘ │ │  │ Apr 5  Apr 7  Apr 9  Apr11│  │   │
│  └────────────────────────────────┘ │  └────────────────────────────┘  │   │
│                                     └──────────────────────────────────┘   │
│                                                                             │
│  ┌────────────────────────────────┐ ┌──────────────────────────────────┐   │
│  │  RESELLER SALDO MOVEMENT      │ │  PROFILE POPULARITY              │   │
│  │  ┌──────────────────────────┐ │ │  ┌────────────────────────────┐  │   │
│  │  │ John  ████████░░ +120k   │ │ │  │      ╭─────╮               │  │   │
│  │  │ Jane  ██████░░░░ +80k    │ │ │  │   ╭──┤ 45% ├──╮            │  │   │
│  │  │ Bob   ████░░░░░░ +40k    │ │ │  │   │  ╰─────╯  │  1 Hari    │  │   │
│  │  │ Alice ██████████ +150k   │ │ │  │  30%        20%  3 Hari    │  │   │
│  │  │                          │ │ │  │  3 Hari    7 Hari         │  │   │
│  │  └──────────────────────────┘ │ │  │     5% - 30 Hari          │  │   │
│  └────────────────────────────────┘ │  └────────────────────────────┘  │   │
│                                     └──────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  DAILY VOUCHER GENERATION BY RESELLER                                 │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │     █                                                          │  │  │
│  │  │     █  █        █                    █                         │  │  │
│  │  │  █  █  █  █  █  █  █     █  █  █  █  █  █                     │  │  │
│  │  │  █  █  █  █  █  █  █  █  █  █  █  █  █  █  █  █              │  │  │
│  │  │ ────────────────────────────────────────────────────────────  │  │  │
│  │  │  1   3   5   7   9   11  13  15  17  19  21  23  25  27      │  │  │
│  │  │                         April 2026                            │  │  │
│  │  │                                                                │  │  │
│  │  │  ■ John  ■ Jane  ■ Bob  ■ Alice  ■ Others                     │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.6 Settings (Admin)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SETTINGS                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Profile] [MikroTik] [Hotspot] [Security] [Backup]                        │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  MIKROTIK CONNECTION                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Host/IP      : [id-11.tunnel.web.id__________]                │  │  │
│  │  │  Winbox Port  : [6904_____]                                    │  │  │
│  │  │  API Port     : [8728_____]                                    │  │  │
│  │  │  Username     : [admin____]                                    │  │  │
│  │  │  Password     : [••••••••••]  [Show]                           │  │  │
│  │  │                                                                │  │  │
│  │  │  Status       : 🟢 Connected                                   │  │  │
│  │  │  Last Sync    : 10 April 2026, 10:30 WIB                       │  │  │
│  │  │                                                                │  │  │
│  │  │  [🔌 Test Connection]  [🔄 Sync Now]  [💾 Save]                │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  HOTSPOT SETTINGS                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Login Page URL : [http://hotspot.mynet.id/login_____]         │  │  │
│  │  │  Company Name   : [Root.VCR_________________________]          │  │  │
│  │  │  Company Logo   : [Upload] current: logo.png                   │  │  │
│  │  │                                                                │  │  │
│  │  │                                               [💾 Save]        │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  BACKUP SETTINGS                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Auto Backup    : ● Enabled  ○ Disabled                        │  │  │
│  │  │  Schedule       : [Daily at 02:00 AM ▼]                        │  │  │
│  │  │  Retention      : [Keep last 7 backups ▼]                      │  │  │
│  │  │                                                                │  │  │
│  │  │  Last Backup    : 10 April 2026, 02:00 WIB                     │  │  │
│  │  │  Backup Size    : 15.3 MB                                      │  │  │
│  │  │                                                                │  │  │
│  │  │  [📥 Download Backup]  [🔄 Backup Now]  [📤 Restore]           │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Business Logic

### 6.1 Voucher Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VOUCHER GENERATION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                                                           │
│  │   START     │                                                           │
│  └──────┬──────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────┐     No     ┌─────────────────┐                        │
│  │  Is Admin?      ├───────────►│  Check Wallet   │                        │
│  └────────┬────────┘            │  Balance        │                        │
│           │ Yes                 └────────┬────────┘                        │
│           │                              │                                  │
│           │                              ▼                                  │
│           │                     ┌─────────────────┐     No                 │
│           │                     │  Balance >=     ├──────► [ERROR]         │
│           │                     │  Price - Fee%   │        Insufficient    │
│           │                     └────────┬────────┘        Balance         │
│           │                              │ Yes                             │
│           │                              │                                  │
│           │                              ▼                                  │
│           │                     ┌─────────────────┐                        │
│           │                     │  Deduct Wallet  │                        │
│           │                     │  (Price - Fee%) │                        │
│           │                     └────────┬────────┘                        │
│           │                              │                                  │
│           ▼                              ▼                                  │
│  ┌─────────────────────────────────────────────────────┐                   │
│  │              Generate Voucher Code                   │                   │
│  │  ┌─────────────────────────────────────────────┐    │                   │
│  │  │  1. Get code format from settings           │    │                   │
│  │  │  2. Generate unique code (prefix + random)  │    │                   │
│  │  │  3. Check uniqueness in database            │    │                   │
│  │  │  4. If username=password, set same value    │    │                   │
│  │  └─────────────────────────────────────────────┘    │                   │
│  └────────────────────────┬────────────────────────────┘                   │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐                   │
│  │              Create in MikroTik                      │                   │
│  │  ┌─────────────────────────────────────────────┐    │                   │
│  │  │  API: /ip/hotspot/user/add                  │    │                   │
│  │  │  - name: voucher_code                       │    │                   │
│  │  │  - password: voucher_code (or separate)     │    │                   │
│  │  │  - profile: mikrotik_profile_name           │    │                   │
│  │  │  - limit-uptime: based on profile duration  │    │                   │
│  │  └─────────────────────────────────────────────┘    │                   │
│  └────────────────────────┬────────────────────────────┘                   │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐                   │
│  │              Save to Database                        │                   │
│  │  ┌─────────────────────────────────────────────┐    │                   │
│  │  │  - Insert voucher record                    │    │                   │
│  │  │  - Insert wallet_log (if reseller)          │    │                   │
│  │  │  - Set status = 'unused'                    │    │                   │
│  │  │  - Set mikrotik_synced = true               │    │                   │
│  │  └─────────────────────────────────────────────┘    │                   │
│  └────────────────────────┬────────────────────────────┘                   │
│                           │                                                 │
│                           ▼                                                 │
│                    ┌─────────────┐                                         │
│                    │    END      │                                         │
│                    │  (Success)  │                                         │
│                    └─────────────┘                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Fee Calculation

```javascript
// Fee Calculation Logic
function calculateResellerPrice(basePrice, feePercentage) {
  // feePercentage is discount given to reseller
  // Example: basePrice = 3000, feePercentage = 10
  // resellerPrice = 3000 - (3000 * 10 / 100) = 2700
  
  const discount = basePrice * (feePercentage / 100);
  const resellerPrice = basePrice - discount;
  
  return {
    basePrice: basePrice,           // Rp 3.000
    discount: discount,             // Rp 300
    resellerPrice: resellerPrice,   // Rp 2.700
    adminProfit: basePrice          // Full price (admin doesn't pay)
  };
}
```

### 6.3 Monthly Reset Logic

```javascript
// Cron job runs at 00:00:01 on 1st of every month
// Location: /app/cron/monthly-reset.js

async function monthlyReset() {
  const now = new Date();
  
  // Only run on 1st of month
  if (now.getDate() !== 1) return;
  
  // Archive current month data
  await archiveMonthlyData(now);
  
  // Reset reseller statistics (NOT wallet balance)
  // - Reset daily/weekly voucher counts display
  // - Keep wallet balance intact
  // - Keep voucher history in database (just hide from daily view)
  
  await resetResellerDashboardStats();
  
  console.log(`Monthly reset completed at ${now.toISOString()}`);
}
```

### 6.4 Real-time Voucher Status Sync

```javascript
// Sync active vouchers from MikroTik every 30 seconds
// Location: /app/services/mikrotik-sync.js

async function syncActiveVouchers() {
  // 1. Get active sessions from MikroTik
  const activeSessions = await mikrotik.menu('/ip/hotspot/active').getAll();
  
  // 2. Update voucher status in database
  for (const session of activeSessions) {
    await prisma.voucher.updateMany({
      where: { 
        code: session.user,
        status: 'unused'
      },
      data: {
        status: 'active',
        used_at: new Date(),
        client_ip: session.address,
        client_mac: session['mac-address'],
        expired_at: calculateExpiry(session)
      }
    });
  }
  
  // 3. Check for expired vouchers
  await markExpiredVouchers();
}
```

---

## 7. Security Requirements

### 7.1 Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: Authentication                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • NextAuth.js with JWT sessions                                      │ │
│  │  • Password hashing: bcrypt (12 rounds)                               │ │
│  │  • Session expiry: 24 hours                                           │ │
│  │  • Refresh token rotation                                             │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Layer 2: Authorization (RBAC)                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • Role-based access control (admin, reseller)                        │ │
│  │  • Middleware protection on all API routes                            │ │
│  │  • Resource-level permissions (reseller can only see own data)        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Layer 3: Data Protection                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • Environment variables for sensitive config                         │ │
│  │  • Database connection via SSL                                        │ │
│  │  • Input validation with Zod schemas                                  │ │
│  │  • SQL injection prevention via Prisma ORM                            │ │
│  │  • XSS prevention via React's built-in escaping                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Layer 4: API Security                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • Rate limiting (100 requests/minute per IP)                         │ │
│  │  • CORS configuration                                                 │ │
│  │  • HTTPS enforcement (production)                                     │ │
│  │  • Request size limits                                                │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rootvcr?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# MikroTik (encrypted at rest)
MIKROTIK_HOST="id-11.tunnel.web.id"
MIKROTIK_PORT="6904"
MIKROTIK_API_PORT="8728"
MIKROTIK_USER="admin"
MIKROTIK_PASSWORD="encrypted_password_here"

# Backup
BACKUP_ENABLED="true"
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS="7"

# App
NODE_ENV="production"
APP_NAME="Root.VCR"
```

---

## 8. Deployment Guide

### 8.1 Proxmox VM Requirements

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VM SPECIFICATIONS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Minimum Requirements:                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • CPU     : 2 vCPU                                                   │ │
│  │  • RAM     : 4 GB                                                     │ │
│  │  • Storage : 40 GB SSD                                                │ │
│  │  • OS      : Ubuntu 22.04 LTS                                         │ │
│  │  • Network : Bridge mode (accessible from LAN)                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Recommended Requirements:                                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • CPU     : 4 vCPU                                                   │ │
│  │  • RAM     : 8 GB                                                     │ │
│  │  • Storage : 80 GB SSD                                                │ │
│  │  • OS      : Ubuntu 22.04 LTS                                         │ │
│  │  • Network : Bridge mode with static IP                               │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Installation Steps

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql

# 4. Create database
sudo -u postgres psql
CREATE USER rootvcr WITH PASSWORD 'your_secure_password';
CREATE DATABASE rootvcr OWNER rootvcr;
\q

# 5. Install PM2 globally
sudo npm install -g pm2

# 6. Clone and setup application
git clone <your-repo> /opt/rootvcr
cd /opt/rootvcr
npm install
cp .env.example .env
# Edit .env with your configurations

# 7. Run database migrations
npx prisma migrate deploy
npx prisma db seed

# 8. Build application
npm run build

# 9. Start with PM2
pm2 start npm --name "rootvcr" -- start
pm2 save
pm2 startup

# 10. Setup backup cron
crontab -e
# Add: 0 2 * * * /opt/rootvcr/scripts/backup.sh
```

### 8.3 Backup Strategy

```bash
#!/bin/bash
# /opt/rootvcr/scripts/backup.sh

BACKUP_DIR="/opt/rootvcr/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U rootvcr -h localhost rootvcr > $BACKUP_DIR/db_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db_$DATE.sql

# Backup uploaded files (logos, etc)
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/rootvcr/public/uploads

# Remove old backups
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
```

---

## 9. File Structure

```
rootvcr/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Seed data
├── public/
│   ├── uploads/               # User uploads (logos)
│   └── logo.png               # Default logo
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── admin/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── wallet/
│   │   │   │   ├── resellers/
│   │   │   │   ├── vouchers/
│   │   │   │   ├── analytics/
│   │   │   │   └── settings/
│   │   │   ├── reseller/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── vouchers/
│   │   │   │   ├── analytics/
│   │   │   │   └── settings/
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   ├── vouchers/
│   │   │   ├── wallets/
│   │   │   ├── users/
│   │   │   ├── profiles/
│   │   │   ├── analytics/
│   │   │   ├── settings/
│   │   │   └── mikrotik/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── dashboard/
│   │   ├── vouchers/
│   │   ├── charts/
│   │   └── shared/
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client
│   │   ├── mikrotik.ts        # MikroTik client
│   │   ├── auth.ts            # Auth config
│   │   ├── utils.ts           # Utility functions
│   │   └── validations/       # Zod schemas
│   ├── hooks/
│   │   ├── use-vouchers.ts
│   │   ├── use-wallet.ts
│   │   └── use-mikrotik.ts
│   ├── services/
│   │   ├── voucher.service.ts
│   │   ├── wallet.service.ts
│   │   ├── user.service.ts
│   │   └── mikrotik.service.ts
│   ├── types/
│   │   └── index.ts
│   └── middleware.ts
├── scripts/
│   ├── backup.sh
│   └── monthly-reset.ts
├── .env.example
├── .env.local
├── docker-compose.yml         # Optional: for containerized deployment
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## 10. Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup (Next.js, TypeScript, Tailwind)
- [ ] Database schema design and Prisma setup
- [ ] Authentication system (NextAuth.js)
- [ ] Basic UI layout and navigation
- [ ] MikroTik connection library

### Phase 2: Core Features (Week 3-4)
- [ ] User management (CRUD)
- [ ] Profile management
- [ ] Voucher generation
- [ ] Wallet system
- [ ] MikroTik integration (create/read vouchers)

### Phase 3: Reseller Panel (Week 5)
- [ ] Reseller dashboard
- [ ] Voucher generation with wallet deduction
- [ ] Card mode and sharing features
- [ ] Voucher management view
- [ ] Basic analytics

### Phase 4: Admin Panel (Week 6)
- [ ] Admin dashboard
- [ ] Wallet management (topup/adjust)
- [ ] Reseller management with fee system
- [ ] Voucher settings (code format)
- [ ] Profile assignment to resellers

### Phase 5: Analytics & Reports (Week 7)
- [ ] Charts implementation (Recharts)
- [ ] Export to PDF/Excel
- [ ] Revenue analytics
- [ ] Reseller performance tracking

### Phase 6: Advanced Features (Week 8)
- [ ] Real-time voucher sync
- [ ] PPPoE management
- [ ] Backup system
- [ ] Settings management
- [ ] Monthly reset cron

### Phase 7: Testing & Deployment (Week 9-10)
- [ ] Unit testing
- [ ] Integration testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] Proxmox deployment
- [ ] Documentation

---

## 11. Acceptance Criteria

### 11.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F01 | Admin can login with email/password | High |
| F02 | Reseller can login with email/password | High |
| F03 | Admin can create/edit/delete resellers | High |
| F04 | Admin can topup/adjust reseller wallet | High |
| F05 | Admin can set fee percentage per reseller | High |
| F06 | Admin can manage voucher profiles | High |
| F07 | Admin can assign profiles to resellers | High |
| F08 | Reseller can generate vouchers (wallet deducted) | High |
| F09 | Admin can generate vouchers (no wallet) | High |
| F10 | Voucher synced to MikroTik automatically | High |
| F11 | Card mode with share functionality | Medium |
| F12 | Real-time active voucher display | Medium |
| F13 | Export reports to PDF/Excel | Medium |
| F14 | Analytics with charts | Medium |
| F15 | PPPoE user management | Low |
| F16 | Automatic daily backup | Medium |
| F17 | Monthly data reset for resellers | Medium |

### 11.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NF01 | Page load time | < 3 seconds |
| NF02 | API response time | < 500ms |
| NF03 | MikroTik sync interval | 30 seconds |
| NF04 | Concurrent users | 50+ |
| NF05 | Uptime | 99.5% |
| NF06 | Backup frequency | Daily |
| NF07 | Mobile responsive | Yes |

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **VCR** | Voucher |
| **Hotspot** | MikroTik hotspot service for WiFi authentication |
| **PPPoE** | Point-to-Point Protocol over Ethernet (for fixed connections) |
| **Profile** | Voucher package with defined duration and speed |
| **Fee** | Discount percentage given to reseller |
| **Wallet** | Virtual balance for reseller to generate vouchers |
| **RouterOS API** | MikroTik's API for programmatic access (port 8728) |

---

## 13. Appendix

### A. Sample Voucher Code Formats

```
VCR-A8K2M9XB     (Default: Prefix + 8 alphanumeric)
ROOT-12345678    (Prefix + numeric only)
WF-AbCdEfGh      (Prefix + letters only)
NET-a1B2c3D4     (Prefix + mixed case)
```

### B. Share Message Template

```
━━━━━━━━━━━━━━━━━━━━━━
🎫 VOUCHER WIFI ROOT.VCR
━━━━━━━━━━━━━━━━━━━━━━
📋 Kode: {voucher_code}
📦 Paket: {profile_name}
⏱️ Masa Aktif: {duration}

📶 Cara Pakai:
1. Konek ke WiFi: {wifi_name}
2. Buka browser
3. Login di: {login_url}
4. Masukkan kode voucher

❓ Bantuan: {support_contact}
━━━━━━━━━━━━━━━━━━━━━━
```

### C. MikroTik API Commands Reference

```javascript
// Get all hotspot users
/ip/hotspot/user/print

// Add new hotspot user
/ip/hotspot/user/add name=VCR-XXX password=VCR-XXX profile=1day

// Get active sessions
/ip/hotspot/active/print

// Remove user session (kick)
/ip/hotspot/active/remove .id=*1

// Get hotspot profiles
/ip/hotspot/user/profile/print

// Delete all cookies
/ip/hotspot/cookie/remove [find]

// PPPoE secrets
/ppp/secret/print
/ppp/active/print
```

---

**End of Document**

---

*Document Version: 1.0*
*Last Updated: April 2026*
*Author: Claude AI Assistant*
*For: Root.VCR Project*
