import { describe, it, expect, beforeEach } from "vitest"
import { checkRateLimit, __resetRateLimitStore } from "@/lib/rate-limit"

describe("checkRateLimit (fixed window, in-memory)", () => {
  beforeEach(() => {
    __resetRateLimitStore()
  })

  it("allows requests up to the limit", () => {
    const opts = { limit: 3, windowMs: 1000 }
    const now = 1_000_000

    expect(checkRateLimit("ip-a", opts, now).ok).toBe(true)
    expect(checkRateLimit("ip-a", opts, now).ok).toBe(true)
    const third = checkRateLimit("ip-a", opts, now)
    expect(third.ok).toBe(true)
    expect(third.remaining).toBe(0)
  })

  it("blocks the request that exceeds the limit and reports retryAfter", () => {
    const opts = { limit: 2, windowMs: 1000 }
    const now = 1_000_000

    checkRateLimit("ip-b", opts, now)
    checkRateLimit("ip-b", opts, now)
    const blocked = checkRateLimit("ip-b", opts, now + 200)

    expect(blocked.ok).toBe(false)
    expect(blocked.remaining).toBe(0)
    // window started at now=1_000_000, ends at +1000; at now+200 → 0.8s left → ceil = 1
    expect(blocked.retryAfter).toBe(1)
  })

  it("resets once the window has elapsed", () => {
    const opts = { limit: 1, windowMs: 1000 }
    const start = 1_000_000

    expect(checkRateLimit("ip-c", opts, start).ok).toBe(true)
    expect(checkRateLimit("ip-c", opts, start + 500).ok).toBe(false)
    // after the window fully elapses, the counter resets
    expect(checkRateLimit("ip-c", opts, start + 1001).ok).toBe(true)
  })

  it("tracks distinct keys independently", () => {
    const opts = { limit: 1, windowMs: 1000 }
    const now = 1_000_000

    expect(checkRateLimit("ip-x", opts, now).ok).toBe(true)
    expect(checkRateLimit("ip-y", opts, now).ok).toBe(true)
    expect(checkRateLimit("ip-x", opts, now).ok).toBe(false)
  })
})
