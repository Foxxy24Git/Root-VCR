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
  status: "unused" | "active" | "inactive" | "expired"
  client_ip: string | null
  client_mac: string | null
}

export interface VoucherSyncInput {
  code: string
}

/**
 * Parse RouterOS uptime/limit-uptime string (e.g. "1d2h30m10s", "45m", "3600s")
 * into total seconds. Returns 0 for empty or unparseable input.
 */
function parseUptime(str: string | undefined): number {
  if (!str || str === "0s" || str === "") return 0

  let total = 0
  const d = str.match(/(\d+)d/)
  const h = str.match(/(\d+)h/)
  const m = str.match(/(\d+)m/)
  const s = str.match(/(\d+)s/)

  if (d) total += parseInt(d[1]) * 86400
  if (h) total += parseInt(h[1]) * 3600
  if (m) total += parseInt(m[1]) * 60
  if (s) total += parseInt(s[1])

  return total
}

/**
 * Parses a Mikhmon comment date string (expire time) into a Date.
 * Mikhmon writes the expire time as: "jan/dd/yyyy hh:mm:ss"
 * Returns null if the comment doesn't match this format.
 */
function parseMikrotikDate(str?: string): Date | null {
  if (!str) return null
  try {
    const months: Record<string, number> = {
      jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
      jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
    }
    const parts = str.trim().split(' ')
    if (parts.length < 2) return null
    const [datePart, timePart] = parts
    const [mon, day, year] = datePart.split('/')
    const month = months[mon?.toLowerCase()]
    if (month === undefined) return null
    const [h, m, s] = timePart.split(':').map(Number)
    return new Date(Number(year), month, Number(day), h, m, s)
  } catch {
    return null
  }
}

/**
 * Pure MikroTik function — no DB access.
 * Computes the correct status for each voucher based on
 * /ip/hotspot/active and /ip/hotspot/user (comment = expire time from Mikhmon).
 *
 * Priority:
 *   1. ACTIVE   — found in /ip/hotspot/active (realtime)
 *   2. EXPIRED  — comment parses to a date AND now > that date
 *   3. UNUSED   — no user record OR uptime == 0 (never logged in)
 *   4. INACTIVE — logged in before, currently offline, not expired
 */
export async function computeVoucherStatuses(
  vouchers: VoucherSyncInput[]
): Promise<VoucherSyncResult[]> {
  const client = await createMikrotikClient()
  const conn = await client.connect()
  try {
    const [activeList, userList] = await Promise.all([
      conn.menu("/ip/hotspot/active").getAll() as Promise<HotspotActive[]>,
      conn.menu("/ip/hotspot/user").getAll() as Promise<HotspotUser[]>,
    ])

    console.log("[computeVoucherStatuses] active:", activeList.length, "user:", userList.length)

    // Build O(1) lookup maps (stringify keys — routeros-client may return numbers at runtime)
    const activeMap = new Map<string, HotspotActive>()
    for (const a of activeList) {
      const user = String(a.user ?? "")
      const name = String(a.name ?? "")
      if (user) activeMap.set(user, a)
      if (name && name !== user) activeMap.set(name, a)
    }

    const userMap = new Map<string, Record<string, string | undefined>>()
    for (const u of userList) {
      // Stringify to handle routeros-client returning numeric names as JS numbers at runtime
      const name = String(u.name ?? "")
      if (name) userMap.set(name, u as Record<string, string | undefined>)
    }

    const now = new Date()

    return vouchers.map((v) => {
      const codeStr = String(v.code)

      // 1. ACTIVE — highest priority
      const active = activeMap.get(codeStr)
      if (active) {
        console.log(`[computeVoucherStatuses] ${codeStr} → active, ip=${active.address}`)
        return {
          code: v.code,
          status: "active" as const,
          client_ip: active.address ?? null,
          client_mac: active["mac-address"] ?? null,
        }
      }

      const userMt = userMap.get(codeStr)
      const uptimeSeconds = parseUptime(userMt?.["uptime"])
      const comment = userMt?.["comment"]
      const expireTime = parseMikrotikDate(comment)

      console.log(`[computeVoucherStatuses] ${v.code} comment="${comment}" expireTime=${expireTime?.toISOString() ?? "null"}`)

      // 2. EXPIRED — comment is Mikhmon expire date and it's in the past
      if (expireTime && now > expireTime) {
        console.log(`[computeVoucherStatuses] ${v.code} → expired (expire=${expireTime.toISOString()})`)
        return { code: v.code, status: "expired" as const, client_ip: null, client_mac: null }
      }

      // 3. UNUSED — never logged in
      if (!userMt || uptimeSeconds === 0) {
        console.log(`[computeVoucherStatuses] ${v.code} → unused`)
        return { code: v.code, status: "unused" as const, client_ip: null, client_mac: null }
      }

      // 4. INACTIVE — logged in before, currently offline, not expired
      console.log(`[computeVoucherStatuses] ${v.code} → inactive (${uptimeSeconds}s used)`)
      return { code: v.code, status: "inactive" as const, client_ip: null, client_mac: null }
    })
  } finally {
    await client.disconnect().catch(() => {})
  }
}
