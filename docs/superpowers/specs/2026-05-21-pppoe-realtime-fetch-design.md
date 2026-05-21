# PPPoE Real-time Fetch Design

**Date:** 2026-05-21
**Status:** Approved

## Problem

Tab PPPoE di `/admin/vouchers` saat ini membaca dari tabel `PppoeUser` di database (hasil sync manual yang tidak pernah diisi). Tabel kosong, sehingga menu PPPoE tidak menampilkan data. User butuh data real-time langsung dari MikroTik.

## Solution

Tab PPPoE diubah menjadi client-side fetch yang memanggil endpoint API baru `GET /api/mikrotik/pppoe`. Endpoint ini menggabungkan dua call MikroTik:

- `/ppp/secret` — daftar semua user PPPoE terdaftar (offline + online)
- `/ppp/active` — user PPPoE yang sedang online

Dependency ke tabel `PppoeUser` di tab ini di-drop. Tabel boleh tetap di schema (untuk kemungkinan use case lain), tapi tidak lagi sumber kebenaran untuk tampilan ini.

Admin Dashboard mendapat satu stats card baru "PPPoE Online" dengan format `<online> / <total>`, fetch server-side langsung lewat service function (bukan client fetch ke API sendiri).

## Components

### 1. `src/services/mikrotik.service.ts`

Tambah dua fungsi baru, menggunakan helper `withMikrotik` (konsisten dengan `getHotspotProfiles`, `getActiveUsers`):

```ts
export interface PppoeSecret {
  ".id": string
  name: string
  profile?: string
  service?: string
  [key: string]: string | undefined
}

export interface PppoeActive {
  ".id"?: string
  name: string
  "caller-id"?: string
  address?: string
  uptime?: string
  [key: string]: string | undefined
}

export async function getPPPoESecrets(): Promise<PppoeSecret[]>
export async function getPPPoEActive(): Promise<PppoeActive[]>
```

Tambahan: helper `getPPPoEStatus()` yang return `{ total, online, offline, users }` siap pakai oleh API route DAN Dashboard SSR — supaya tidak ada duplikasi logic merge.

### 2. `src/app/api/mikrotik/pppoe/route.ts` (baru)

```
GET /api/mikrotik/pppoe
→ requireAdmin
→ panggil getPPPoEStatus()
→ response 200: { total, online, offline, users: [...] }
→ response 502: { error, message } jika MikroTik gagal connect
```

Format `users[]` sesuai spec:
```
{
  name: string,
  profile: string,
  service: string,
  status: 'online' | 'offline',
  caller_id: string | null,
  address: string | null,
  uptime: string | null,
}
```

### 3. `PppoeManagement` di `VoucherAdminTabs.tsx`

Refactor dari prop-driven ke client-side fetch:

- State: `data`, `loading`, `error`
- `useEffect` fetch awal + setup interval 30 detik untuk auto-refresh
- Tombol "Refresh" untuk manual refetch
- Stats cards di atas table: **Total Users**, **Online**, **Offline**
- Table columns: Username | Profile | Status | IP Address | Uptime | Caller ID
  - Status badge: hijau (Online) dengan dot indicator / abu (Offline)
- Loading: skeleton rows di table body
- Empty state: "Tidak ada user PPPoE terdaftar" (data fetched tapi kosong)
- Error: inline red banner di atas table (mengikuti pattern `syncMsg` yang ada)
- Mobile cards version untuk responsive

Karena tab ini sekarang fully client-side, prop `pppoeUsers` di `VoucherAdminTabsProps` dapat di-drop bersama dengan query Prisma di `page.tsx`.

### 4. Admin Dashboard (`src/app/(dashboard)/admin/dashboard/page.tsx`)

Tambah satu stats card di grid stats utama. Karena ini Server Component, panggil `getPPPoEStatus()` langsung (bukan fetch ke API sendiri). Wrap dalam `try/catch`: kalau MikroTik gagal, tampilkan card dengan value `"—"` (degraded gracefully, tidak crash dashboard).

```tsx
<StatsCard
  title="PPPoE Online"
  value={`${online} / ${total}`}
  icon={Wifi}
  iconClassName="..."
/>
```

Grid sekarang 5 cards (atau 4 cards di row pertama + 1 di row kedua, tergantung layout — keep simple, biarkan grid responsif yang ada handle).

## Data Flow

```
Browser (PPPoE tab)
    │ fetch GET /api/mikrotik/pppoe (initial + every 30s + manual refresh)
    ▼
API Route /api/mikrotik/pppoe
    │ requireAdmin
    │ getPPPoEStatus()
    ▼
mikrotik.service.ts
    │ withMikrotik(api => Promise.all([
    │   api.menu('/ppp/secret').getAll(),
    │   api.menu('/ppp/active').getAll(),
    │ ]))
    │ merge: tandai secret yang ada di active list sebagai 'online'
    ▼
MikroTik RouterOS

(Admin Dashboard memanggil getPPPoEStatus() langsung di SSR — bypass API route)
```

## Error Handling

- **MikroTik tidak terkoneksi:**
  - PPPoE tab: inline red banner "Gagal terhubung ke MikroTik: <error>"
  - Dashboard: card menampilkan "—" tanpa crash
- **Data kosong (MikroTik terkoneksi tapi tidak ada secret):**
  - Empty state "Tidak ada user PPPoE terdaftar"
- **Network error di client (fetch fail):**
  - Inline banner "Gagal memuat data PPPoE"

## Testing

Manual test plan:
- Buka `/admin/vouchers?tab=pppoe` — data PPPoE muncul dari MikroTik
- Stats cards: Total = secrets count, Online = active count, Offline = selisihnya
- Status badge per user akurat (cocokkan dengan MikroTik UI)
- Tombol Refresh memicu refetch
- Auto-refresh berjalan tiap 30 detik (cek di Network tab)
- Loading skeleton tampil saat fetch pertama
- Empty state tampil kalau MikroTik kosong (set MikroTik tanpa secret untuk uji)
- Disconnect MikroTik → banner error muncul, table tidak hang
- Admin Dashboard menampilkan card "PPPoE Online" dengan angka benar

## Out of Scope

- Tabel `PppoeUser` di Prisma schema tidak diubah/dihapus (keep for future).
- API endpoint sync DB lama (`/api/mikrotik/sync`) tidak diubah.
- Tombol "Sync PPPoE" lama (yang panggil `/api/mikrotik/sync`) di-replace oleh tombol "Refresh" baru.
- Tidak ada fitur add/edit/delete PPPoE user di sini (read-only).
- Tidak ada filter/search/pagination (data PPPoE biasanya tidak terlalu banyak).
