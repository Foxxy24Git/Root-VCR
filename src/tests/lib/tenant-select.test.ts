import { describe, it, expect } from "vitest"
import { TENANT_DETAIL_SELECT } from "@/lib/tenant-select"

// The encrypted MikroTik password must never be returned by any tenant API.
describe("TENANT_DETAIL_SELECT — MikroTik password not exposed", () => {
  it("does not select mikrotik_password_enc", () => {
    expect("mikrotik_password_enc" in TENANT_DETAIL_SELECT).toBe(false)
  })

  it("does not select any field whose name contains 'password'", () => {
    const leaked = Object.keys(TENANT_DETAIL_SELECT).filter((k) =>
      k.toLowerCase().includes("password"),
    )
    expect(leaked).toEqual([])
  })
})
