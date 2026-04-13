import { withMikrotik, testMikrotikConnection } from "@/lib/mikrotik"

export interface HotspotProfile {
  ".id": string
  name: string
  [key: string]: string
}

export interface HotspotUser {
  ".id": string
  name: string
  password?: string
  profile?: string
  [key: string]: string | undefined
}

export interface HotspotActive {
  ".id": string
  user: string
  address?: string
  "uptime"?: string
  [key: string]: string | undefined
}

export interface ConnectionTestResult {
  ok: boolean
  error?: string
  latencyMs?: number
}

/**
 * Test koneksi ke MikroTik.
 * Wrapper dari lib/mikrotik.ts — tidak melempar exception.
 */
export async function testConnection(): Promise<ConnectionTestResult> {
  return testMikrotikConnection()
}

/**
 * Ambil semua hotspot profile dari MikroTik.
 */
export async function getHotspotProfiles(): Promise<HotspotProfile[]> {
  return withMikrotik((api) =>
    api.menu("/ip/hotspot/profile").getAll() as Promise<HotspotProfile[]>
  )
}

/**
 * Buat hotspot user baru di MikroTik.
 *
 * @param code   - username / kode voucher
 * @param password - password hotspot user
 * @param profile  - nama profile hotspot (misal "Paket 1 Hari")
 */
export async function createHotspotUser(
  code: string,
  password: string,
  profile: string
): Promise<{ id: string }> {
  return withMikrotik(async (api) => {
    const result = await api.menu("/ip/hotspot/user").add({
      name: code,
      password,
      profile,
    })
    // routeros-client returns the created object; extract the .id field
    const obj = result as unknown as { id: string }
    return { id: obj.id }
  })
}

/**
 * Ambil semua active hotspot session dari MikroTik.
 */
export async function getActiveUsers(): Promise<HotspotActive[]> {
  return withMikrotik((api) =>
    api.menu("/ip/hotspot/active").getAll() as Promise<HotspotActive[]>
  )
}

/**
 * Hapus hotspot user berdasarkan nama (kode voucher).
 * Tidak melempar exception jika user tidak ditemukan.
 */
export async function deleteUser(code: string): Promise<void> {
  await withMikrotik(async (api) => {
    const users = (await api
      .menu("/ip/hotspot/user")
      .where("name", code)
      .getAll()) as HotspotUser[]

    if (users.length === 0) return

    const id = users[0][".id"]
    await api.menu("/ip/hotspot/user").where(".id", id).remove()
  })
}
