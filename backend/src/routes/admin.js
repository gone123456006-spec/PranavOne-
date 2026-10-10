import { Router } from 'express'
import {
  createAdminToken,
  getAdminDashboardName,
  isAdminConfigured,
  requireAdmin,
  requireSales,
  verifyAdminLogin,
} from '../adminAuth.js'
import { listAdminUsers } from '../db/adminStore.js'
import {
  getChartsData,
  getOverviewStats,
  getRegisteredUserDetail,
  getVisitorPeriodStats,
  listRegisteredUsersAdmin,
  listVisitorSessionsAdmin,
  listVisitorsAdmin,
  refreshAnalyticsAggregates,
} from '../db/analyticsStore.js'
import {
  addLeadPayment,
  createLead,
  deleteLead,
  deleteLeadPayment,
  getLeadStats,
  listLeads,
  logLeadCall,
  syncWebsiteLeads,
  updateLead,
} from '../db/leadsStore.js'
import { buildUsersExcelBuffer } from '../exportUsersExcel.js'
import {
  formatAmountLabel,
  getAppSettings,
  toPublicSettings,
  updateAppSettings,
} from '../settingsStore.js'

export const adminRouter = Router()

adminRouter.get('/status', (_req, res) => {
  res.json({
    dashboard: getAdminDashboardName(),
    configured: isAdminConfigured(),
  })
})

adminRouter.post('/login', (req, res) => {
  if (!isAdminConfigured()) {
    return res.status(503).json({
      message: 'TredsDash is not configured. Set ADMIN_PASSWORD on the server.',
    })
  }

  const password = String(req.body?.password || '')
  const account = verifyAdminLogin(req.body?.username, password)
  if (!account) {
    return res.status(401).json({ message: 'Incorrect username or password.' })
  }

  const token = createAdminToken(account)
  return res.json({
    dashboard: getAdminDashboardName(),
    token,
    role: account.role,
    username: account.username,
    expiresInHours: 12,
  })
})

adminRouter.get('/session', requireSales, (req, res) => {
  res.json({
    dashboard: getAdminDashboardName(),
    ok: true,
    role: req.admin.role,
    username: req.admin.username || null,
    exp: req.admin?.exp || null,
  })
})

/** Legacy full list (payments included) — kept for compatibility. */
adminRouter.get('/users', requireAdmin, async (_req, res, next) => {
  try {
    const users = await listAdminUsers()
    res.json({
      dashboard: getAdminDashboardName(),
      count: users.length,
      users,
    })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/registered-users', requireAdmin, async (req, res, next) => {
  try {
    const data = await listRegisteredUsersAdmin({
      q: req.query.q,
      status: req.query.status || 'all',
      sort: req.query.sort || 'newest',
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      pageSize: req.query.pageSize,
    })
    res.json({ dashboard: getAdminDashboardName(), ...data })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/registered-users/:tenantId', requireAdmin, async (req, res, next) => {
  try {
    const detail = await getRegisteredUserDetail(req.params.tenantId)
    if (!detail) {
      return res.status(404).json({ message: 'User not found.' })
    }
    res.json({ dashboard: getAdminDashboardName(), user: detail })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/overview', requireAdmin, async (_req, res, next) => {
  try {
    const overview = await getOverviewStats()
    void refreshAnalyticsAggregates().catch(() => undefined)
    res.json({ dashboard: getAdminDashboardName(), overview })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/analytics/visitors', requireAdmin, async (req, res, next) => {
  try {
    const period = String(req.query.period || 'today')
    const stats = await getVisitorPeriodStats(period)
    res.json({ dashboard: getAdminDashboardName(), ...stats })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/analytics/charts', requireAdmin, async (_req, res, next) => {
  try {
    const charts = await getChartsData()
    res.json({ dashboard: getAdminDashboardName(), charts })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/visitors', requireAdmin, async (req, res, next) => {
  try {
    const data = await listVisitorsAdmin({
      q: req.query.q,
      sort: req.query.sort || 'newest',
      page: req.query.page,
      pageSize: req.query.pageSize,
      from: req.query.from,
      to: req.query.to,
    })
    res.json({ dashboard: getAdminDashboardName(), ...data })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/visitor-sessions', requireAdmin, async (req, res, next) => {
  try {
    const data = await listVisitorSessionsAdmin({
      page: req.query.page,
      pageSize: req.query.pageSize,
    })
    res.json({ dashboard: getAdminDashboardName(), ...data })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/export/users.xlsx', requireAdmin, async (req, res, next) => {
  try {
    const { buffer, filename, count } = await buildUsersExcelBuffer({
      preset: req.query.preset || 'month',
      from: req.query.from,
      to: req.query.to,
    })
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('X-Export-Count', String(count))
    res.send(buffer)
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/leads', requireSales, async (req, res, next) => {
  try {
    const data = await listLeads({
      stage: req.query.stage,
      status: req.query.status,
      q: req.query.q,
      due: req.query.due === '1',
      batch: req.query.batch,
      payment: req.query.payment,
      source: req.query.source,
      page: req.query.page,
      pageSize: req.query.pageSize,
    })
    res.json(data)
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/leads/stats', requireSales, async (_req, res, next) => {
  try {
    res.json({ stats: await getLeadStats() })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/leads', requireSales, async (req, res, next) => {
  try {
    const lead = await createLead(req.body || {})
    res.status(201).json({ lead })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/leads/sync-website', requireSales, async (_req, res, next) => {
  try {
    res.json(await syncWebsiteLeads())
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/leads/:id/calls', requireSales, async (req, res, next) => {
  try {
    const lead = await logLeadCall(req.params.id, req.body || {})
    res.json({ lead })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/leads/:id/payments', requireSales, async (req, res, next) => {
  try {
    const lead = await addLeadPayment(req.params.id, req.body || {})
    res.status(201).json({ lead })
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/leads/:id/payments/:paymentId', requireAdmin, async (req, res, next) => {
  try {
    const lead = await deleteLeadPayment(req.params.id, req.params.paymentId)
    res.json({ lead })
  } catch (error) {
    next(error)
  }
})

adminRouter.patch('/leads/:id', requireSales, async (req, res, next) => {
  try {
    const lead = await updateLead(req.params.id, req.body || {})
    res.json({ lead })
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/leads/:id', requireAdmin, async (req, res, next) => {
  try {
    res.json(await deleteLead(req.params.id))
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/settings', requireAdmin, async (_req, res, next) => {
  try {
    const settings = await getAppSettings({ force: true })
    res.json({
      dashboard: getAdminDashboardName(),
      settings: {
        amountPaise: settings.workshopAmountPaise,
        amountRupees: settings.workshopAmountPaise / 100,
        amountLabel: formatAmountLabel(settings.workshopAmountPaise),
        updatedAt: settings.updatedAt,
        source: settings.source,
      },
      public: toPublicSettings(settings),
    })
  } catch (error) {
    next(error)
  }
})

adminRouter.put('/settings', requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {}
    const patch = {}

    if (Object.prototype.hasOwnProperty.call(body, 'amountPaise')) {
      patch.workshopAmountPaise = body.amountPaise
    }
    if (Object.prototype.hasOwnProperty.call(body, 'amountRupees')) {
      patch.amountRupees = body.amountRupees
    }

    if (!Object.keys(patch).length) {
      return res.status(400).json({ message: 'No settings to update.' })
    }

    const settings = await updateAppSettings(patch)
    res.json({
      dashboard: getAdminDashboardName(),
      message: 'Settings saved. Website will reflect changes within a few seconds.',
      settings: {
        amountPaise: settings.workshopAmountPaise,
        amountRupees: settings.workshopAmountPaise / 100,
        amountLabel: formatAmountLabel(settings.workshopAmountPaise),
        updatedAt: settings.updatedAt,
        source: settings.source,
      },
      public: toPublicSettings(settings),
    })
  } catch (error) {
    next(error)
  }
})
