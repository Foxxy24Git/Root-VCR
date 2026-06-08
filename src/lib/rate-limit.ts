/**
 * Lightweight in-memory fixed-window rate limiter.
 *
 * Keyed by an arbitrary string (typically client IP + route). Counts requests
 * within a window; once the count exceeds `limit`, requests are rejected until
 * the window elapses.
 *
 * CAVEAT: state lives in process memory. It is per-instance and resets on
 * restart/deploy — adequate for a single-instance deployment (Proxmox). For
 * multi-instance, back this with Redis/Upstash instead. See SECURITY.md.
 */

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  /** Requests still allowed in the current window (0 when blocked). */
  remaining: number
  /** Seconds until the window resets (for a `Retry-After` header). */
  retryAfter: number
}

interface Bucket {
  count: number
  windowStart: number
}

const store = new Map<string, Bucket>()

/** Reset all counters. Test-only helper. */
export function __resetRateLimitStore(): void {
  store.clear()
}

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
  now: number = Date.now(),
): RateLimitResult {
  const { limit, windowMs } = opts
  let bucket = store.get(key)

  // Start a fresh window if none exists or the previous one has elapsed.
  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { count: 0, windowStart: now }
    store.set(key, bucket)
  }

  bucket.count += 1

  const ok = bucket.count <= limit
  const remaining = Math.max(0, limit - bucket.count)
  const retryAfter = ok
    ? 0
    : Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000))

  return { ok, remaining, retryAfter }
}
