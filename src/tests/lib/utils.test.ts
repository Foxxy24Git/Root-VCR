import { describe, it, expect } from "vitest"
import { formatRupiah } from "@/lib/utils"

describe("formatRupiah", () => {
  it("prefixes with 'Rp ' and uses id-ID thousands separators", () => {
    expect(formatRupiah(50000)).toBe("Rp 50.000")
    expect(formatRupiah(1234567)).toBe("Rp 1.234.567")
  })

  it("formats zero", () => {
    expect(formatRupiah(0)).toBe("Rp 0")
  })

  it("rounds to whole rupiah (no fractional cents)", () => {
    expect(formatRupiah(50000.49)).toBe("Rp 50.000")
  })
})
