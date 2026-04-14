import { RouterOSClient } from "routeros-client"

export interface MikrotikConfig {
  host: string
  port: number        // tunnel/external port (MIKROTIK_PORT, e.g. 6904)
  user: string
  password: string
  timeout: number     // seconds
}

/**
 * Baca konfigurasi MikroTik dari environment variables.
 * Throws jika variabel wajib tidak ada.
 */
export function getMikrotikConfig(): MikrotikConfig {
  const host     = process.env.MIKROTIK_HOST
  const portStr  = process.env.MIKROTIK_PORT      // port tunnel/external
  const user     = process.env.MIKROTIK_USER
  const password = process.env.MIKROTIK_PASSWORD

  if (!host)     throw new Error("MIKROTIK_HOST tidak dikonfigurasi")
  if (!portStr)  throw new Error("MIKROTIK_PORT tidak dikonfigurasi")
  if (!user)     throw new Error("MIKROTIK_USER tidak dikonfigurasi")
  if (password === undefined || password === null)
    throw new Error("MIKROTIK_PASSWORD tidak dikonfigurasi")

  return {
    host,
    port: parseInt(portStr, 10),
    user,
    password,
    timeout: parseInt(process.env.MIKROTIK_TIMEOUT ?? "10", 10),
  }
}

/**
 * Buat fresh RouterOSClient dari environment variables.
 * Setiap operasi pakai client baru agar tidak ada shared state.
 */
export function createMikrotikClient(cfg?: MikrotikConfig): RouterOSClient {
  const config = cfg ?? getMikrotikConfig()
  return new RouterOSClient({
    host:     config.host,
    port:     config.port,
    user:     config.user,
    password: config.password,
    timeout:  config.timeout,
    keepalive: false,
  })
}

/**
 * Eksekusi satu operasi MikroTik dengan auto connect/disconnect.
 *
 * Menutup koneksi di `finally` sehingga tidak ada resource leak
 * bahkan jika `fn` melempar exception.
 *
 * Contoh:
 *   const users = await withMikrotik(api =>
 *     api.menu("/ip/hotspot/user").getAll()
 *   )
 */
export async function withMikrotik<T>(
  fn: (api: ReturnType<RouterOSClient["api"]>) => Promise<T>
): Promise<T> {
  const client = createMikrotikClient()
  const conn = await client.connect()
  try {
    return await fn(conn)
  } finally {
    await client.disconnect().catch(() => {
      // Abaikan error disconnect — koneksi mungkin sudah putus
    })
  }
}

/**
 * Test koneksi ke MikroTik.
 * Tidak melempar exception — selalu return { ok, error?, latencyMs? }.
 */
export async function testMikrotikConnection(): Promise<{
  ok: boolean
  error?: string
  latencyMs?: number
}> {
  const start = Date.now()
  const client = createMikrotikClient()
  try {
    await client.connect()
    const latencyMs = Date.now() - start
    await client.disconnect().catch(() => {})
    return { ok: true, latencyMs }
  } catch (err) {
    await client.disconnect().catch(() => {})
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
