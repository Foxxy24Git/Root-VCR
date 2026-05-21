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

export interface PppoeSecret {
  ".id"?: string
  id?: string
  name: string
  profile?: string
  service?: string
  comment?: string
  [key: string]: string | undefined
}

export interface PppoeActive {
  ".id"?: string
  id?: string
  name: string
  "caller-id"?: string
  address?: string
  uptime?: string
  service?: string
  [key: string]: string | undefined
}

export interface PppoeUserStatus {
  name: string
  profile: string
  service: string
  status: "online" | "offline"
  caller_id: string | null
  address: string | null
  uptime: string | null
}

export interface PppoeStatusResult {
  total: number
  online: number
  offline: number
  users: PppoeUserStatus[]
}

export interface ConnectionTestResult {
  ok: boolean
  error?: string
  latencyMs?: number
}

export function parseSessionTimeout(timeout: string | undefined): { days: number; hours: number } {
  if (!timeout || timeout === "0s" || timeout === "none") return { days: 0, hours: 0 }
  if (/^\d+d/.test(timeout)) {
    const days = parseInt(timeout)
    const hoursMatch = timeout.match(/(\d+)h/)
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0
    return { days: isNaN(days) ? 0 : days, hours }
  }
  const parts = timeout.split(":")
  if (parts.length === 3) {
    const totalHours = parseInt(parts[0])
    const days = Math.floor(totalHours / 24)
    const hours = totalHours % 24
    return { days, hours }
  }
  return { days: 0, hours: 0 }
}

export async function testConnection(tenantId: string): Promise<ConnectionTestResult> {
  return testMikrotikConnection(tenantId)
}

export async function getHotspotProfiles(tenantId: string): Promise<HotspotProfile[]> {
  return withMikrotik(tenantId, (api) =>
    api.menu("/ip/hotspot/user/profile").getAll() as Promise<HotspotProfile[]>
  )
}

export async function deleteHotspotProfile(
  tenantId: string,
  profileId: string
): Promise<{ success: boolean }> {
  const client = await createMikrotikClient(tenantId)
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
  tenantId: string,
  code: string,
  password: string,
  mikrotikProfile: string
): Promise<{ success: boolean; id?: string }> {
  if (!mikrotikProfile) {
    throw new Error("mikrotik_profile tidak dikonfigurasi pada profil ini")
  }

  const client = await createMikrotikClient(tenantId)
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

export async function getActiveUsers(tenantId: string): Promise<HotspotActive[]> {
  return withMikrotik(tenantId, (api) =>
    api.menu("/ip/hotspot/active").getAll() as Promise<HotspotActive[]>
  )
}

export async function deleteUser(tenantId: string, code: string): Promise<void> {
  await withMikrotik(tenantId, async (api) => {
    const users = (await api
      .menu("/ip/hotspot/user")
      .where("name", code)
      .getAll()) as HotspotUser[]

    if (users.length === 0) return

    const id = users[0][".id"]
    await api.menu("/ip/hotspot/user").where(".id", id).remove()
  })
}

export async function logoutHotspotUser(
  tenantId: string,
  code: string
): Promise<{ success: boolean; removed: number }> {
  const client = await createMikrotikClient(tenantId)
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

export async function deleteHotspotCookie(
  tenantId: string,
  code: string
): Promise<{ success: boolean; removed: number }> {
  const client = await createMikrotikClient(tenantId)
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

export async function computeVoucherStatuses(
  tenantId: string,
  vouchers: VoucherSyncInput[]
): Promise<VoucherSyncResult[]> {
  const client = await createMikrotikClient(tenantId)
  const conn = await client.connect()
  try {
    const [activeList, userList] = await Promise.all([
      conn.menu("/ip/hotspot/active").getAll() as Promise<HotspotActive[]>,
      conn.menu("/ip/hotspot/user").getAll() as Promise<HotspotUser[]>,
    ])

    console.log("[computeVoucherStatuses] active:", activeList.length, "user:", userList.length)

    const activeMap = new Map<string, HotspotActive>()
    for (const a of activeList) {
      const user = String(a.user ?? "")
      const name = String(a.name ?? "")
      if (user) activeMap.set(user, a)
      if (name && name !== user) activeMap.set(name, a)
    }

    const userMap = new Map<string, Record<string, string | undefined>>()
    for (const u of userList) {
      const name = String(u.name ?? "")
      if (name) userMap.set(name, u as Record<string, string | undefined>)
    }

    const now = new Date()

    return vouchers.map((v) => {
      const codeStr = String(v.code)

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

      if (expireTime && now > expireTime) {
        console.log(`[computeVoucherStatuses] ${v.code} → expired (expire=${expireTime.toISOString()})`)
        return { code: v.code, status: "expired" as const, client_ip: null, client_mac: null }
      }

      if (!userMt || uptimeSeconds === 0) {
        console.log(`[computeVoucherStatuses] ${v.code} → unused`)
        return { code: v.code, status: "unused" as const, client_ip: null, client_mac: null }
      }

      console.log(`[computeVoucherStatuses] ${v.code} → inactive (${uptimeSeconds}s used)`)
      return { code: v.code, status: "inactive" as const, client_ip: null, client_mac: null }
    })
  } finally {
    await client.disconnect().catch(() => {})
  }
}

// ─────────────────────────────────────────────────────────────
// PPPoE — real-time fetch from MikroTik
// ─────────────────────────────────────────────────────────────

export async function getPPPoESecrets(tenantId: string): Promise<PppoeSecret[]> {
  return withMikrotik(tenantId, (api) =>
    api.menu("/ppp/secret").getAll() as Promise<PppoeSecret[]>
  )
}

export async function getPPPoEActive(tenantId: string): Promise<PppoeActive[]> {
  return withMikrotik(tenantId, (api) =>
    api.menu("/ppp/active").getAll() as Promise<PppoeActive[]>
  )
}

export async function getPPPoEStatus(tenantId: string): Promise<PppoeStatusResult> {
  const [secrets, active] = await withMikrotik(tenantId, async (api) => {
    const [s, a] = await Promise.all([
      api.menu("/ppp/secret").getAll() as Promise<PppoeSecret[]>,
      api.menu("/ppp/active").getAll() as Promise<PppoeActive[]>,
    ])
    return [s, a] as const
  })

  const activeMap = new Map<string, PppoeActive>()
  for (const a of active) {
    const name = String(a.name ?? "")
    if (name) activeMap.set(name, a)
  }

  const users: PppoeUserStatus[] = secrets.map((s) => {
    const name = String(s.name ?? "")
    const a = activeMap.get(name)
    const isOnline = !!a
    return {
      name,
      profile: s.profile ?? "",
      service: s.service ?? "pppoe",
      status: isOnline ? "online" : "offline",
      caller_id: a?.["caller-id"] ?? null,
      address: a?.address ?? null,
      uptime: a?.uptime ?? null,
    }
  })

  const online = users.filter((u) => u.status === "online").length

  return {
    total: users.length,
    online,
    offline: users.length - online,
    users,
  }
}
