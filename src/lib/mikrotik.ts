import { RouterOSClient } from "routeros-client"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"

export interface MikrotikConfig {
  host: string
  port: number
  user: string
  password: string
  timeout: number
  useSSL: boolean
}

/**
 * Baca config MikroTik milik tenant tertentu dari kolom `tenant.mikrotik_*`
 * dan decrypt password. Password disimpan ter-enkripsi (AES-256-GCM).
 *
 * @throws Error jika tenant tidak ditemukan atau config belum lengkap.
 */
export async function getMikrotikConfig(tenantId: string): Promise<MikrotikConfig> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      mikrotik_host: true,
      mikrotik_port: true,
      mikrotik_username: true,
      mikrotik_password_enc: true,
      mikrotik_use_ssl: true,
    },
  })

  if (!tenant) throw new Error(`Tenant ${tenantId} tidak ditemukan`)
  if (!tenant.mikrotik_host) throw new Error(`Tenant ${tenant.slug}: mikrotik_host kosong`)
  if (!tenant.mikrotik_username) throw new Error(`Tenant ${tenant.slug}: mikrotik_username kosong`)
  if (!tenant.mikrotik_password_enc) {
    throw new Error(`Tenant ${tenant.slug}: mikrotik_password belum di-set`)
  }

  return {
    host: tenant.mikrotik_host,
    port: tenant.mikrotik_port,
    user: tenant.mikrotik_username,
    password: decrypt(tenant.mikrotik_password_enc),
    timeout: 10,
    useSSL: tenant.mikrotik_use_ssl,
  }
}

/**
 * Buat fresh RouterOSClient. Setiap operasi pakai client baru — tidak ada
 * shared state antar request.
 */
export async function createMikrotikClient(
  tenantIdOrConfig: string | MikrotikConfig
): Promise<RouterOSClient> {
  const config =
    typeof tenantIdOrConfig === "string"
      ? await getMikrotikConfig(tenantIdOrConfig)
      : tenantIdOrConfig

  return new RouterOSClient({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    timeout: config.timeout,
    keepalive: false,
  })
}

/**
 * Eksekusi satu operasi MikroTik dengan auto connect/disconnect.
 */
export async function withMikrotik<T>(
  tenantId: string,
  fn: (api: ReturnType<RouterOSClient["api"]>) => Promise<T>
): Promise<T> {
  const client = await createMikrotikClient(tenantId)
  const conn = await client.connect()
  try {
    return await fn(conn)
  } finally {
    await client.disconnect().catch(() => {})
  }
}

/**
 * Test koneksi ke MikroTik tenant. Tidak throw — selalu return result object.
 * Side effect: update `tenant.mikrotik_last_test_at` & `mikrotik_last_test_ok`.
 */
export async function testMikrotikConnection(tenantId: string): Promise<{
  ok: boolean
  error?: string
  latencyMs?: number
}> {
  const start = Date.now()
  let result: { ok: boolean; error?: string; latencyMs?: number }
  try {
    const client = await createMikrotikClient(tenantId)
    await client.connect()
    const latencyMs = Date.now() - start
    await client.disconnect().catch(() => {})
    result = { ok: true, latencyMs }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    result = { ok: false, error: message }
  }

  // Update audit fields (best-effort)
  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        mikrotik_last_test_at: new Date(),
        mikrotik_last_test_ok: result.ok,
      },
    })
  } catch {
    // ignore — bukan hal kritis
  }

  return result
}

/**
 * Variant testMikrotikConnection yang menerima config inline (untuk endpoint
 * Test Connection sebelum save credential ke DB).
 */
export async function testMikrotikConnectionWithConfig(
  config: Omit<MikrotikConfig, "timeout">
): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
  const start = Date.now()
  try {
    const client = new RouterOSClient({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      timeout: 10,
      keepalive: false,
    })
    await client.connect()
    const latencyMs = Date.now() - start
    await client.disconnect().catch(() => {})
    return { ok: true, latencyMs }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
