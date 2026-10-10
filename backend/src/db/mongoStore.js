/**
 * Mongo tenant/profile/registration store (Pranav One website data).
 */
import { randomUUID } from 'node:crypto'
import { col } from './mongo.js'

function normEmail(email) {
  return email ? String(email).trim().toLowerCase() : null
}

function normUid(uid) {
  return uid ? String(uid).trim() : null
}

async function resolveTenantId({ email, uid }) {
  const normalizedEmail = normEmail(email)
  const normalizedUid = normUid(uid)
  if (!normalizedEmail && !normalizedUid) {
    const error = new Error('Cannot create user profile without email or uid.')
    error.status = 400
    throw error
  }

  const existing = await col('profiles').findOne({
    $or: [
      ...(normalizedUid
        ? [{ uid: normalizedUid }, { tenantId: `uid_${normalizedUid}` }]
        : []),
      ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
    ],
  })
  if (existing?.tenantId) return existing.tenantId

  return normalizedUid
    ? `uid_${normalizedUid}`
    : `email_${Buffer.from(normalizedEmail).toString('hex').slice(0, 40)}`
}

function mapProfile(doc, tenantId) {
  if (!doc) {
    return {
      tenantId,
      email: null,
      uid: null,
      name: null,
      phone: null,
      picture: null,
      provider: null,
      emailVerified: false,
      status: 'active',
      subscriptionStatus: 'none',
      subscriptionType: null,
      subscriptionActivatedAt: null,
      createdAt: null,
      updatedAt: null,
      lastLoginAt: null,
    }
  }
  return {
    tenantId: doc.tenantId,
    email: doc.email || null,
    uid: doc.uid || null,
    name: doc.name || null,
    phone: doc.phone || null,
    location: doc.location || null,
    picture: doc.picture || null,
    provider: doc.provider || null,
    emailVerified: Boolean(doc.emailVerified),
    status: doc.status || 'active',
    subscriptionStatus: doc.subscriptionStatus || 'none',
    subscriptionType: doc.subscriptionType || null,
    subscriptionActivatedAt: doc.subscriptionActivatedAt || null,
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    lastLoginAt: doc.lastLoginAt || null,
  }
}

export async function mongoGetOwnProfile(tenantId) {
  const id = String(tenantId)
  const [profile, registrations] = await Promise.all([
    col('profiles').findOne({ tenantId: id }),
    col('registrations').find({ tenantId: id }).sort({ joinedAt: -1 }).toArray(),
  ])
  return {
    tenantId: id,
    profile: mapProfile(profile, id),
    registrationCount: registrations.length,
    latestRegistration: registrations[0] || null,
  }
}

export async function mongoGetOwnDatabaseSnapshot(tenantId) {
  const id = String(tenantId)
  const [profile, registrations, activity] = await Promise.all([
    col('profiles').findOne({ tenantId: id }),
    col('registrations').find({ tenantId: id }).sort({ joinedAt: -1 }).toArray(),
    col('activity').find({ tenantId: id }).sort({ at: -1 }).limit(50).toArray(),
  ])
  return {
    tenantId: id,
    profile: mapProfile(profile, id),
    registrations,
    activity,
  }
}

export async function mongoUpsertRegistration(identity, registration) {
  const tenantId = await resolveTenantId(identity)
  const email = normEmail(registration.email || identity.email)
  const now = new Date()
  await col('profiles').updateOne(
    { tenantId },
    {
      $set: {
        email,
        uid: normUid(identity.uid),
        name: registration.name || identity.name || null,
        phone: registration.phone || identity.phone || null,
        updatedAt: now,
      },
      $setOnInsert: {
        tenantId,
        createdAt: now,
        status: 'active',
        subscriptionStatus: 'none',
      },
    },
    { upsert: true },
  )
  const result = await col('registrations').updateOne(
    { tenantId, email },
    {
      $set: {
        name: registration.name || null,
        phone: registration.phone || null,
        status: registration.status || 'joined',
        updatedAt: now,
      },
      $setOnInsert: {
        _id: randomUUID(),
        tenantId,
        email,
        joinedAt: now,
      },
    },
    { upsert: true },
  )
  const alreadyJoined = !result.upsertedId
  if (!alreadyJoined) {
    await col('activity').insertOne({
      _id: randomUUID(),
      tenantId,
      type: 'registration',
      details: { email },
      at: now,
    })
  }
  return { tenantId, alreadyJoined }
}

export async function mongoListProfiles() {
  const rows = await col('profiles')
    .find({})
    .sort({ lastLoginAt: -1, updatedAt: -1, createdAt: -1 })
    .toArray()
  return rows.map((doc) => mapProfile(doc, doc.tenantId))
}
