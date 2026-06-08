import { describe, it, expect } from "vitest"
import { needsTrialSuspension } from "@/lib/trial"

describe("needsTrialSuspension", () => {
  const now = new Date("2026-06-08T00:00:00Z")
  const past = new Date("2026-06-01T00:00:00Z")
  const future = new Date("2026-06-20T00:00:00Z")

  it("suspends an active trial whose trial_end_at has passed", () => {
    expect(
      needsTrialSuspension({ is_trial: true, is_active: true, trial_end_at: past }, now),
    ).toBe(true)
  })

  it("does not suspend a trial that has not yet expired", () => {
    expect(
      needsTrialSuspension({ is_trial: true, is_active: true, trial_end_at: future }, now),
    ).toBe(false)
  })

  it("does not suspend a non-trial (paid) tenant", () => {
    expect(
      needsTrialSuspension({ is_trial: false, is_active: true, trial_end_at: past }, now),
    ).toBe(false)
  })

  it("does not re-suspend an already inactive tenant", () => {
    expect(
      needsTrialSuspension({ is_trial: true, is_active: false, trial_end_at: past }, now),
    ).toBe(false)
  })

  it("does not suspend when trial_end_at is null", () => {
    expect(
      needsTrialSuspension({ is_trial: true, is_active: true, trial_end_at: null }, now),
    ).toBe(false)
  })
})
