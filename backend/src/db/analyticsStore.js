/**
 * Visitor / session / page-view tracking + admin analytics queries.
 * Stubs: no analytics storage is wired up yet. Implement these against
 * MongoDB (see ./mongo.js) and keep the same return shapes for TredsDash.
 */

function emptyPage(key, pageSize = 20) {
  return { [key]: [], total: 0, page: 1, pageSize, totalPages: 0 }
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
  return {
    totalRegisteredUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
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

export async function listRegisteredUsersAdmin({ pageSize = 20 } = {}) {
  return emptyPage('users', pageSize)
}

export async function getRegisteredUserDetail() {
  return null
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
