import { RouterOSClient } from "routeros-client"
import { prisma } from "@/lib/prisma"

export interface MikrotikConfig {
  host: string
  port: number        // tunnel/external port
  user: string
  password: string
  timeout: number     // seconds
}

/**
 * Baca konfigurasi MikroTik dari database (settings table).
 * Fallback ke environment variables jika DB kosong.
 */
export async function getMikrotikConfig(): Promise<MikrotikConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["mikrotik_host", "mikrotik_api_port", "mikrotik_user", "mikrotik_pass"] } },
  })

  const get = (key: string): string | null => rows.find((r) => r.key === key)?.value ?? null

  const host     = get("mikrotik_host")     || process.env.MIKROTIK_HOST     || null
  const portStr  = get("mikrotik_api_port") || process.env.MIKROTIK_API_PORT || null
  const user     = get("mikrotik_user")     || process.env.MIKROTIK_USER     || null
  const password = get("mikrotik_pass")     ?? process.env.MIKROTIK_PASSWORD ?? null

  if (!host)     throw new Error("MIKROTIK_HOST tidak dikonfigurasi")
  if (!portStr)  throw new Error("MIKROTIK_PORT tidak dikonfigurasi")
  if (!user)     throw new Error("MIKROTIK_USER tidak dikonfigurasi")
  if (password === null) throw new Error("MIKROTIK_PASSWORD tidak dikonfigurasi")

  return {
    host,
    port: parseInt(portStr, 10),
    user,
    password,
    timeout: 10,
  }
}

/**
 * Buat fresh RouterOSClient dari DB settings.
 * Setiap operasi pakai client baru agar tidak ada shared state.
 */
export async function createMikrotikClient(cfg?: MikrotikConfig): Promise<RouterOSClient> {
  const config = cfg ?? await getMikrotikConfig()
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
 */
export async function withMikrotik<T>(
  fn: (api: ReturnType<RouterOSClient["api"]>) => Promise<T>
): Promise<T> {
  const client = await createMikrotikClient()
  const conn = await client.connect()
  try {
    return await fn(conn)
  } finally {
    await client.disconnect().catch(() => {})
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
  try {
    const client = await createMikrotikClient()
    await client.connect()
    const latencyMs = Date.now() - start
    await client.disconnect().catch(() => {})
    return { ok: true, latencyMs }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
