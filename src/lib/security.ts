import { NextResponse } from "next/server"
import { checkRateLimit, type RateLimitOptions } from "@/lib/rate-limit"

/**
 * CSRF defence via same-origin checking.
 *
 * Browsers always attach an `Origin` header to cross-site state-changing
 * requests, so verifying it (with `Referer` as a fallback) blocks forged
 * cross-site POST/PATCH/DELETE. Requests with neither header are treated as
 * non-browser clients (e.g. curl, server-to-server) and allowed — those are not
 * subject to browser CSRF and are still gated by auth + SameSite cookies.
 */

function hostOf(url: string): string | null {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

export function isAllowedOrigin(
  origin: string | null,
  referer: string | null,
  allowedHosts: string[],
): boolean {
  if (origin) {
    const host = hostOf(origin)
    return host !== null && allowedHosts.includes(host)
  }
  if (referer) {
    const host = hostOf(referer)
    return host !== null && allowedHosts.includes(host)
  }
  return true
}

/** Hosts the app is served from. NEXTAUTH_URL drives production; localhost for dev. */
function allowedHosts(): string[] {
  const hosts = new Set<string>()
  const fromEnv = process.env.NEXTAUTH_URL
  if (fromEnv) {
    const h = hostOf(fromEnv)
    if (h) hosts.add(h)
  }
  hosts.add("localhost:3000")
  return Array.from(hosts)
}

/**
 * Guard a state-changing API route. Returns a 403 `NextResponse` when the
 * request looks like a forged cross-site request, otherwise `null`.
 */
export function assertSameOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin")
  const referer = req.headers.get("referer")
  if (!isAllowedOrigin(origin, referer, allowedHosts())) {
    return NextResponse.json(
      { error: "Forbidden", message: "Cross-origin request ditolak" },
      { status: 403 },
    )
  }
  return null
}

/** Best-effort client IP from common proxy headers. */
export function clientIp(req: Request): string {
  const h = req.headers
  const fwd = h.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "unknown"
}

/**
 * Per-IP rate-limit guard for a route. Returns a 429 `NextResponse` (with
 * `Retry-After`) when the caller has exceeded the limit, otherwise `null`.
 */
export function enforceRateLimit(
  req: Request,
  routeKey: string,
  opts: RateLimitOptions,
): NextResponse | null {
  const result = checkRateLimit(`${routeKey}:${clientIp(req)}`, opts)
  if (result.ok) return null
  return NextResponse.json(
    { error: "Too Many Requests", message: "Terlalu banyak permintaan, coba lagi nanti" },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  )
}
