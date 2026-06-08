/**
 * Trial lifecycle rules. Pure functions so the policy can be unit-tested without
 * a database; the cron route (`/api/cron/check-trial-expiry`) applies the same
 * rule via a Prisma query.
 */

export interface TrialState {
  is_trial: boolean
  is_active: boolean
  trial_end_at: Date | null
}

/** True when an active trial tenant has passed its trial end and must be suspended. */
export function needsTrialSuspension(tenant: TrialState, now: Date): boolean {
  if (!tenant.is_trial || !tenant.is_active) return false
  if (!tenant.trial_end_at) return false
  return tenant.trial_end_at.getTime() < now.getTime()
}
