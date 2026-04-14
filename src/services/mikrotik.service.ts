import { createMikrotikClient, testMikrotikConnection } from "@/lib/mikrotik"
import { withMikrotik } from "@/lib/mikrotik"

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
  ".id": string
  user: string
  address?: string
  "uptime"?: string
  [key: string]: string | undefined
}

export interface HotspotCookie {
  ".id": string
  user: string
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

export async function logoutHotspotUser(code: string): Promise<void> {
  await withMikrotik(async (api) => {
    const sessions = (await api
      .menu("/ip/hotspot/active")
      .where("user", code)
      .getAll()) as HotspotActive[]

    for (const s of sessions) {
      const id = s[".id"]
      if (id) await api.menu("/ip/hotspot/active").where(".id", id).remove()
    }
  })
}

export async function deleteHotspotCookie(code: string): Promise<void> {
  await withMikrotik(async (api) => {
    const cookies = (await api
      .menu("/ip/hotspot/cookie")
      .where("user", code)
      .getAll()) as HotspotCookie[]

    for (const c of cookies) {
      const id = c[".id"]
      if (id) await api.menu("/ip/hotspot/cookie").where(".id", id).remove()
    }
  })
}
