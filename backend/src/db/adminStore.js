/**
 * Admin directory: users + subscription.
 */

import { buildSubscription } from '../subscription.js'
import { mongoListProfiles } from './mongoStore.js'

function mapAdminUser(profile) {
  const subscription = buildSubscription(profile || {})
  return {
    tenantId: profile?.tenantId || null,
    user: {
      name: profile?.name || null,
      email: profile?.email || null,
      phone: profile?.phone || null,
      uid: profile?.uid || null,
      provider: profile?.provider || null,
      emailVerified: Boolean(profile?.emailVerified),
      picture: profile?.picture || null,
      createdAt: profile?.createdAt || null,
      lastLoginAt: profile?.lastLoginAt || null,
      status: profile?.status || null,
    },
    subscription: {
      status: subscription.status,
      type: subscription.type,
      label: subscription.label,
      activatedAt: subscription.activatedAt,
      expiresAt: null,
    },
  }
}

export async function listAdminUsers() {
  const profiles = await mongoListProfiles()
  return profiles.map(mapAdminUser)
}
