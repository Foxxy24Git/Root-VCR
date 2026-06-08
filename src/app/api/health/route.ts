import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public health probe for deploy scripts and uptime monitoring.
// Returns 200 when the app can reach the database, 503 otherwise.
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: "ok",
      db: "up",
      time: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      { status: "error", db: "down", time: new Date().toISOString() },
      { status: 503 },
    )
  }
}
