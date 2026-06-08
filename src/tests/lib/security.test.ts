import { describe, it, expect } from "vitest"
import { isAllowedOrigin } from "@/lib/security"

describe("isAllowedOrigin (CSRF same-origin guard)", () => {
  const allowed = ["app.example.com", "localhost:3000"]

  it("allows when the Origin host matches an allowed host", () => {
    expect(isAllowedOrigin("https://app.example.com", null, allowed)).toBe(true)
  })

  it("rejects when the Origin host is different (forged cross-site request)", () => {
    expect(isAllowedOrigin("https://evil.com", null, allowed)).toBe(false)
  })

  it("falls back to the Referer host when Origin is absent", () => {
    expect(isAllowedOrigin(null, "https://app.example.com/admin", allowed)).toBe(true)
    expect(isAllowedOrigin(null, "https://evil.com/x", allowed)).toBe(false)
  })

  it("allows when neither header is present (non-browser client; cookies + SameSite still apply)", () => {
    expect(isAllowedOrigin(null, null, allowed)).toBe(true)
  })
})
