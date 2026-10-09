/**
 * One-time permanent (lifetime) subscription helpers.
 * No expiry / renewal — entitlement is account-bound until admin revoke.
 */

export function buildSubscription(profile = {}) {
  const revoked = profile.subscriptionStatus === 'revoked'
  const explicitLifetime =
    profile.subscriptionStatus === 'active' &&
    profile.subscriptionType === 'lifetime'

  const active = !revoked && explicitLifetime

  return {
    status: revoked ? 'revoked' : active ? 'active' : 'none',
    type: active ? 'lifetime' : null,
    activatedAt: active
      ? profile.subscriptionActivatedAt || profile.updatedAt || null
      : null,
    expiresAt: null,
    label: active ? 'Subscription: Active' : 'No active subscription',
  }
}
