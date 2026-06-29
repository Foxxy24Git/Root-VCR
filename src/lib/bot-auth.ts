import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"

/**
 * Auth guard for the internal WhatsApp-bot API (`/api/bot/*`).
 *
 * These endpoints are server-to-server (called by the Baileys bot process), so
 * they don't use the NextAuth session or the same-origin CSRF guard. Instead the
 * bot sends a shared secret in the `x-bot-secret` header, compared against the
 * `BOT_API_SECRET` env var.
 *
 * Returns a `NextResponse` to short-circuit with when the request is not
 * authenticated, or `null` when the caller is authorised.
 *
 * Usage in a route:
 * ```ts
 *   const unauth = assertBotAuth(req)
 *   if (unauth) return unauth
 * ```
 */
export function assertBotAuth(req: Request): NextResponse | null {
  const secret = process.env.BOT_API_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Server Misconfigured", message: "BOT_API_SECRET belum di-set" },
      { status: 500 },
    )
  }

  const provided = req.headers.get("x-bot-secret") ?? ""
  if (!safeEqual(provided, secret)) {
    return NextResponse.json(
      { error: "Unauthorized", message: "x-bot-secret tidak valid" },
      { status: 401 },
    )
  }

  return null
}

/** Constant-time string comparison that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}
