import { createMikrotikClient, testMikrotikConnection, withMikrotik } from "@/lib/mikrotik"

export interface HotspotProfile {
  ".id": string
  name: string
  "rate-limit"?: string
  "session-timeout"?: string
  [key: string]: string | undefined
}

export interface HotspotUser {
  ".id": string
  name: string
  password?: string
  profile?: string
  [key: string]: string | undefined
}

export interface HotspotActive {
  ".id"?: string
  id?: string
  user: string
  name?: string
  address?: string
  "uptime"?: string
  [key: string]: string | undefined
}

export interface HotspotCookie {
  ".id"?: string
  id?: string
  user: string
  name?: string
  [key: string]: string | undefined
}

export interface ConnectionTestResult {
  ok: boolean
  error?: string
  latencyMs?: number
}

export function parseSessionTimeout(timeout: string | undefined): { days: number; hours: number } {
  if (!timeout || timeout === "0s" || timeout === "none") return { days: 0, hours: 0 }
  // Format: "1d", "1d12h", "24:00:00", "00:30:00"
  if (/^\d+d/.test(timeout)) {
    const days = parseInt(timeout)
    const hoursMatch = timeout.match(/(\d+)h/)
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0
    return { days: isNaN(days) ? 0 : days, hours }
  }
  // HH:MM:SS format
  const parts = timeout.split(":")
  if (parts.length === 3) {
    const totalHours = parseInt(parts[0])
    const days = Math.floor(totalHours / 24)
    const hours = totalHours % 24
    return { days, hours }
  }
  return { days: 0, hours: 0 }
}

export async function testConnection(): Promise<ConnectionTestResult> {
  return testMikrotikConnection()
}

export async function getHotspotProfiles(): Promise<HotspotProfile[]> {
  return withMikrotik((api) =>
    api.menu("/ip/hotspot/user/profile").getAll() as Promise<HotspotProfile[]>
  )
}

export async function deleteHotspotProfile(profileId: string): Promise<{ success: boolean }> {
  const client = await createMikrotikClient()
  const conn = await client.connect()
  try {
    const profiles = (await conn.menu("/ip/hotspot/user/profile").getAll()) as Array<Record<string, string | undefined>>

    const target = profiles.find((p) => p.id === profileId || p.name === profileId)

    if (!target) {
      throw new Error("Profile not found")
    }

    const targetId = target.id
    if (!targetId) {
      throw new Error("Profile ID not found")
    }

    console.log("REMOVING PROFILE ID:", targetId)
    await conn.menu("/ip/hotspot/user/profile").remove(targetId)
    console.log("PROFILE REMOVED:", targetId)

    return { success: true }
  } finally {
    await client.disconnect().catch(() => {})
  }
}

export async function createHotspotUser(
  code: string,
  password: string,
  mikrotikProfile: string
): Promise<{ success: boolean; id?: string }> {
  if (!mikrotikProfile) {
    throw new Error("mikrotik_profile tidak dikonfigurasi pada profil ini")
  }

  const client = await createMikrotikClient()
  try {
    const conn = await client.connect()
    const result = await conn.menu("/ip/hotspot/user").add({
      name: code,
      password: password,
      profile: mikrotikProfile,
    })
    await client.disconnect().catch(() => {})
    const obj = result as unknown as { id?: string }
    return { success: true, id: obj.id }
  } catch (err) {
    console.error("MIKROTIK ERROR [createHotspotUser]:", err)
    await client.disconnect().catch(() => {})
    throw new Error(
      `Failed create hotspot user: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export async function getActiveUsers(): Promise<HotspotActive[]> {
  return withMikrotik((api) =>
    api.menu("/ip/hotspot/active").getAll() as Promise<HotspotActive[]>
  )
}

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

export async function logoutHotspotUser(code: string): Promise<{ success: boolean; removed: number }> {
  const client = await createMikrotikClient()
  const conn = await client.connect()
  try {
    console.log(`[MIKROTIK] logoutHotspotUser: START code="${code}"`)

    const activeList = (await conn.menu("/ip/hotspot/active").getAll()) as HotspotActive[]
    console.log("ACTIVE LIST:", JSON.stringify(activeList))

    const activeTarget = activeList.find((item) => item.user === code || item.name === code)

    if (!activeTarget) {
      console.log("ACTIVE NOT FOUND:", code)
      return { success: false, removed: 0 }
    }

    const activeId = activeTarget.id ?? activeTarget[".id"]
    if (activeId) {
      console.log("REMOVING ID:", activeId)
      await conn.menu("/ip/hotspot/active").remove(activeId)
      console.log("ACTIVE REMOVED:", activeId)
    } else {
      console.log("ACTIVE NO ID:", JSON.stringify(activeTarget))
    }

    return { success: true, removed: 1 }
  } finally {
    await client.disconnect().catch(() => {})
  }
}

export async function deleteHotspotCookie(code: string): Promise<{ success: boolean; removed: number }> {
  const client = await createMikrotikClient()
  const conn = await client.connect()
  try {
    console.log(`[MIKROTIK] deleteHotspotCookie: START code="${code}"`)

    const cookieList = (await conn.menu("/ip/hotspot/cookie").getAll()) as HotspotCookie[]
    console.log("COOKIE LIST:", JSON.stringify(cookieList))

    const cookieTarget = cookieList.find((item) => item.user === code || item.name === code)

    if (!cookieTarget) {
      console.log("COOKIE NOT FOUND:", code)
      return { success: false, removed: 0 }
    }

    const cookieId = cookieTarget.id ?? cookieTarget[".id"]
    if (cookieId) {
      console.log("REMOVING ID:", cookieId)
      await conn.menu("/ip/hotspot/cookie").remove(cookieId)
      console.log("COOKIE REMOVED:", cookieId)
    } else {
      console.log("COOKIE NO ID:", JSON.stringify(cookieTarget))
    }

    return { success: true, removed: 1 }
  } finally {
    await client.disconnect().catch(() => {})
  }
}

// ─────────────────────────────────────────────────────────────
// Voucher Status Sync
// ─────────────────────────────────────────────────────────────

export interface VoucherSyncResult {
  code: string
  status: "unused" | "active" | "expired"
  client_ip: string | null
  client_mac: string | null
}

/**
 * Pure MikroTik function — no DB access.
 * Computes the correct status for each voucher based on
 * /ip/hotspot/active and /ip/hotspot/cookie.
 *
 * Priority: ACTIVE > COOKIE > EXPIRED (used_at set) > UNUSED
 */
export async function computeVoucherStatuses(
  vouchers: Array<{ code: string; used_at: Date | null }>
): Promise<VoucherSyncResult[]> {
  const client = await createMikrotikClient()
  const conn = await client.connect()
  try {
    const [activeList, cookieList] = await Promise.all([
      conn.menu("/ip/hotspot/active").getAll() as Promise<HotspotActive[]>,
      conn.menu("/ip/hotspot/cookie").getAll() as Promise<HotspotCookie[]>,
    ])

    console.log("[computeVoucherStatuses] active:", activeList.length, "cookie:", cookieList.length)

    // Build O(1) lookup maps — match by user OR name field
    const activeMap = new Map<string, HotspotActive>()
    for (const a of activeList) {
      if (a.user) activeMap.set(a.user, a)
      if (a.name && a.name !== a.user) activeMap.set(a.name, a)
    }

    const cookieMap = new Map<string, HotspotCookie>()
    for (const c of cookieList) {
      if (c.user) cookieMap.set(c.user, c)
    }

    return vouchers.map((v) => {
      const active = activeMap.get(v.code)

      if (active) {
        console.log(`[computeVoucherStatuses] ${v.code} → active, ip=${active.address}`)
        return {
          code: v.code,
          status: "active" as const,
          client_ip: active.address ?? null,
          client_mac: (active as Record<string, string | undefined>)["mac-address"] ?? null,
        }
      }

      const cookie = cookieMap.get(v.code)
      if (cookie) {
        console.log(`[computeVoucherStatuses] ${v.code} → active (cookie)`)
        return {
          code: v.code,
          status: "active" as const,
          client_ip: (cookie as Record<string, string | undefined>)["address"] ?? null,
          client_mac: null,
        }
      }

      if (v.used_at !== null) {
        console.log(`[computeVoucherStatuses] ${v.code} → expired`)
        return { code: v.code, status: "expired" as const, client_ip: null, client_mac: null }
      }

      return { code: v.code, status: "unused" as const, client_ip: null, client_mac: null }
    })
  } finally {
    await client.disconnect().catch(() => {})
  }
}
