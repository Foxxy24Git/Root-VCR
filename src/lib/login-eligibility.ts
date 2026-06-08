/**
 * Login eligibility predicates. Pure so the rules can be unit-tested; applied in
 * `auth.ts` for both the tenant-login and super-admin-login providers.
 */

/** A tenant can authenticate only while it is active (not suspended/expired). */
export function tenantCanLogin(tenant: { is_active: boolean }): boolean {
  return tenant.is_active
}

/** A user can authenticate only while active and not frozen. */
export function userCanLogin(user: { is_active: boolean; is_frozen: boolean }): boolean {
  return user.is_active && !user.is_frozen
}
