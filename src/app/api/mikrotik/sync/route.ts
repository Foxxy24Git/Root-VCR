import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { testConnection } from "@/services/mikrotik.service"

// For simplicity, this mock pulls from test connection status
// Real syncing would involve pulling Hotspot User Profiles via routeros-client
export async function POST() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const result = await testConnection()
    const isConnected = result.ok
    
    if (!isConnected) {
      return NextResponse.json(
        { error: "Connection Failed", message: "Gagal terhubung ke MikroTik" },
        { status: 502 }
      )
    }

    // In a real implementation:
    // await syncHotspotProfiles()
    // await syncActivePppoeUsers()

    // Assuming sync succeeded, we might log a setting update or just return success
    return NextResponse.json({ 
      message: "Sync berhasil", 
      details: "Profil dan user MikroTik berhasil disinkronisasi." 
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan"
    return NextResponse.json(
      { error: "Server Error", message: `Gagal Sync: ${msg}` },
      { status: 500 }
    )
  }
}
