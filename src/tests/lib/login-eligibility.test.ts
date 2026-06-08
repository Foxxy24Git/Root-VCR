import { describe, it, expect } from "vitest"
import { tenantCanLogin, userCanLogin } from "@/lib/login-eligibility"

describe("tenantCanLogin", () => {
  it("allows an active tenant", () => {
    expect(tenantCanLogin({ is_active: true })).toBe(true)
  })

  it("blocks a suspended (inactive) tenant", () => {
    expect(tenantCanLogin({ is_active: false })).toBe(false)
  })
})

describe("userCanLogin", () => {
  it("allows an active, non-frozen user", () => {
    expect(userCanLogin({ is_active: true, is_frozen: false })).toBe(true)
  })

  it("blocks an inactive user", () => {
    expect(userCanLogin({ is_active: false, is_frozen: false })).toBe(false)
  })

  it("blocks a frozen user", () => {
    expect(userCanLogin({ is_active: true, is_frozen: true })).toBe(false)
  })
})
