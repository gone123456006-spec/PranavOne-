/**
 * Visitor / session / page-view tracking + admin analytics queries.
 * Visitor tracking is still a stub. Registered users (Get Started form data)
 * are read from the MongoDB `users` collection.
 */
import { col, isMongoEnabled } from './mongo.js'

const ACTIVE_WINDOW_MS = 72 * 60 * 60 * 1000

function emptyPage(key, pageSize = 20) {
  return { [key]: [], total: 0, page: 1, pageSize, totalPages: 0 }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function activeSubscriptionMap(userIds) {
  const subs = await col('subscriptions')
    .find({ userId: { $in: userIds }, status: 'active' })
    .toArray()
  return new Map(subs.map((s) => [s.userId, s]))
}

function mapRegisteredUser(doc, sub) {
  const active =
    doc.lastLoginAt && Date.now() - new Date(doc.lastLoginAt).getTime() < ACTIVE_WINDOW_MS
  return {
    tenantId: `uid_${doc._id}`,
    userId: doc._id,
    name: doc.name || null,
    email: doc.email || null,
    phone: doc.phone || null,
    location: doc.location || null,
    status: doc.status || 'active',
    activityStatus: active ? 'active' : 'inactive',
    createdAt: doc.createdAt || null,
    lastLoginAt: doc.lastLoginAt || null,
    subscriptionStatus: sub ? 'active' : 'none',
    subscriptionType: sub?.plan || null,
    subscriptionActivatedAt: sub?.activatedAt || null,
  }
}

export async function trackVisitorEvent() {
  return { ok: false, reason: 'analytics_not_configured' }
}

export async function recordUserLoginSession() {
  return { ok: false }
}

export async function endUserSession() {
  return { ok: false }
}

export async function linkVisitorToTenant() {
  return { ok: false }
}

export async function getOverviewStats() {
  let totalRegisteredUsers = 0
  let activeUsers = 0
  let newUsersToday = 0
  if (isMongoEnabled()) {
    ;[totalRegisteredUsers, activeUsers, newUsersToday] = await Promise.all([
      col('users').countDocuments({}),
      col('users').countDocuments({
        lastLoginAt: { $gte: new Date(Date.now() - ACTIVE_WINDOW_MS) },
      }),
      col('users').countDocuments({ createdAt: { $gte: startOfToday() } }),
    ])
  }
  return {
    totalRegisteredUsers,
    activeUsers,
    newUsersToday,
    visitorsToday: 0,
    visitorsThisWeek: 0,
    visitorsThisMonth: 0,
    conversionRate: 0,
    sessionsToday: 0,
    pageViewsToday: 0,
    analyticsNotConfigured: true,
  }
}

export async function getVisitorPeriodStats(period = 'today') {
  return {
    period,
    uniqueVisitors: 0,
    sessions: 0,
    pageViews: 0,
    newVisitors: 0,
    returningVisitors: 0,
    series: [],
  }
}

export async function getChartsData() {
  return {
    visitorsOverTime: [],
    registeredUsersOverTime: [],
    conversionOverTime: [],
    newVsReturning: [],
  }
}

export async function listRegisteredUsersAdmin({
  q = '',
  status = 'all',
  sort = 'newest',
  from,
  to,
  page = 1,
  pageSize = 20,
} = {}) {
  const size = Math.min(100, Math.max(1, Number(pageSize) || 20))
  if (!isMongoEnabled()) return emptyPage('users', size)
  const current = Math.max(1, Number(page) || 1)

  const filter = {}
  const search = String(q || '').trim().slice(0, 80)
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { location: rx }]
  }

  const created = {}
  if (from) {
    const d = new Date(from)
    if (!Number.isNaN(d.getTime())) created.$gte = d
  }
  if (to) {
    const d = new Date(to)
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999)
      created.$lte = d
    }
  }
  if (Object.keys(created).length) filter.createdAt = created

  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS)
  if (status === 'active') filter.lastLoginAt = { $gte: activeSince }
  if (status === 'inactive') {
    filter.$and = [{ $or: [{ lastLoginAt: null }, { lastLoginAt: { $lt: activeSince } }] }]
  }
  if (status === 'subscribed') {
    const subs = await col('subscriptions')
      .find({ status: 'active' })
      .project({ userId: 1 })
      .toArray()
    filter._id = { $in: subs.map((s) => s.userId) }
  }

  const sortSpec =
    sort === 'oldest'
      ? { createdAt: 1 }
      : sort === 'last_login'
        ? { lastLoginAt: -1, createdAt: -1 }
        : { createdAt: -1 }

  const [rows, total] = await Promise.all([
    col('users')
      .find(filter)
      .sort(sortSpec)
      .skip((current - 1) * size)
      .limit(size)
      .toArray(),
    col('users').countDocuments(filter),
  ])
  const subs = await activeSubscriptionMap(rows.map((r) => r._id))

  return {
    users: rows.map((doc) => mapRegisteredUser(doc, subs.get(doc._id))),
    total,
    page: current,
    pageSize: size,
    totalPages: Math.max(1, Math.ceil(total / size)),
  }
}

export async function getRegisteredUserDetail(tenantId) {
  if (!isMongoEnabled()) return null
  const userId = String(tenantId || '').replace(/^uid_/, '')
  const doc = await col('users').findOne({ _id: userId })
  if (!doc) return null
  const subs = await activeSubscriptionMap([doc._id])
  return { user: mapRegisteredUser(doc, subs.get(doc._id)), sessions: [] }
}

export async function listVisitorsAdmin({ pageSize = 20 } = {}) {
  return emptyPage('visitors', pageSize)
}

export async function listVisitorSessionsAdmin({ pageSize = 20 } = {}) {
  return emptyPage('sessions', pageSize)
}

export async function exportUsersRows() {
  return []
}

export async function refreshAnalyticsAggregates() {
  return { ok: false }
}
