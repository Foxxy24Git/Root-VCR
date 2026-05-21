import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-helpers"
import { testConnection } from "@/services/mikrotik.service"

export async function POST() {
  const { user, error } = await requireAdmin()
  if (error) return error

  try {
    const result = await testConnection(user.tenantId!)
    const isConnected = result.ok

    if (!isConnected) {
      return NextResponse.json(
        { error: "Connection Failed", message: "Gagal terhubung ke MikroTik" },
        { status: 502 }
      )
    }

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
