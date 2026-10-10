import { useCallback, useEffect, useState } from 'react'
import { adminFetch, downloadUsersExport, formatDate } from './adminApi.js'
import { Pagination, SheetLetters, SparkBars, StatCards } from './ui.jsx'

export function OverviewSection({ token, onAuthError }) {
  const [overview, setOverview] = useState(null)
  const [charts, setCharts] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [ov, ch] = await Promise.all([
        adminFetch('/api/admin/overview', { token }),
        adminFetch('/api/admin/analytics/charts', { token }),
      ])
      setOverview(ov.overview)
      setCharts(ch.charts)
      setError('')
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Failed to load overview')
    }
  }, [token, onAuthError])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 20_000)
    return () => window.clearInterval(timer)
  }, [load])

  const cards = [
    { label: 'Total Registered Users', value: overview?.totalRegisteredUsers ?? '—' },
    { label: 'Active Users', value: overview?.activeUsers ?? '—', hint: 'Last 72 hours' },
    { label: 'New Users Today', value: overview?.newUsersToday ?? '—' },
    { label: 'Website Visitors Today', value: overview?.visitorsToday ?? '—' },
    { label: 'Visitors This Week', value: overview?.visitorsThisWeek ?? '—' },
    { label: 'Visitors This Month', value: overview?.visitorsThisMonth ?? '—' },
    {
      label: 'Visitor → User Conversion',
      value: overview ? `${overview.conversionRate}%` : '—',
      hint: 'This month',
    },
  ]

  return (
    <div className="td-section">
      <div className="td-section-head">
        <div>
          <h2>Overview</h2>
          <p className="td-muted">Live summary — auto-refreshes every 20 seconds.</p>
        </div>
        <button type="button" className="td-btn td-btn--ghost" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {error ? <p className="td-error">{error}</p> : null}
      {overview?.analyticsNotConfigured ? (
        <p className="td-muted">Visitor tracking is not connected yet. User counts are live.</p>
      ) : null}
      <StatCards items={cards} />
      <div className="td-grid-2">
        <div className="td-card">
          <h3>Visitors over time</h3>
          <SparkBars
            series={charts?.visitorsOverTime || []}
            keys={['uniqueVisitors', 'sessions']}
            labels={{ uniqueVisitors: 'Unique', sessions: 'Sessions' }}
          />
        </div>
        <div className="td-card">
          <h3>Registered users over time</h3>
          <SparkBars
            series={charts?.registeredUsersOverTime || []}
            keys={['newUsers']}
            labels={{ newUsers: 'New users' }}
          />
        </div>
        <div className="td-card">
          <h3>Visitor → registration conversion</h3>
          <SparkBars
            series={charts?.conversionOverTime || []}
            keys={['rate']}
            labels={{ rate: 'Conversion %' }}
          />
        </div>
        <div className="td-card">
          <h3>New vs returning visitors</h3>
          <SparkBars
            series={charts?.newVsReturning || []}
            keys={['newVisitors', 'returningVisitors']}
            labels={{ newVisitors: 'New', returningVisitors: 'Returning' }}
          />
        </div>
      </div>
    </div>
  )
}

export function RegisteredUsersSection({
  token,
  onAuthError,
  onOpenUser,
  initialStatus = 'all',
  title = 'Registered Users',
  subtitle = null,
}) {
  const [data, setData] = useState({ users: [], page: 1, totalPages: 1, total: 0 })
  const [q, setQ] = useState('')
  const [status, setStatus] = useState(initialStatus)
  const [sort, setSort] = useState('newest')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setStatus(initialStatus)
    setSort('newest')
    setPage(1)
  }, [initialStatus])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q,
        status,
        sort,
        page: String(page),
        pageSize: '20',
      })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await adminFetch(`/api/admin/registered-users?${params}`, { token })
      setData(res)
      setError('')
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [token, q, status, sort, from, to, page, onAuthError])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="td-section">
      <div className="td-section-head">
        <div>
          <h2>{title}</h2>
          <p className="td-muted">
            {subtitle || `${data.total || 0} Get Started form submissions`}
          </p>
        </div>
        <button type="button" className="td-btn td-btn--ghost" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div className="td-filters">
        <input
          className="td-input"
          type="search"
          placeholder="Search name, email, phone…"
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
        />
        {initialStatus !== 'subscribed' ? (
          <select
            className="td-input"
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value)
            }}
          >
            <option value="all">All activity</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="subscribed">Subscribed</option>
          </select>
        ) : null}
        <select
          className="td-input"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="last_login">Last login</option>
        </select>
        <input
          className="td-input"
          type="date"
          value={from}
          onChange={(e) => {
            setPage(1)
            setFrom(e.target.value)
          }}
        />
        <input
          className="td-input"
          type="date"
          value={to}
          onChange={(e) => {
            setPage(1)
            setTo(e.target.value)
          }}
        />
      </div>

      {error ? <p className="td-error">{error}</p> : null}

      <div className="td-sheet-wrap">
        <table className="td-sheet td-sheet--clickable">
          <thead>
            <SheetLetters count={8} />
            <tr>
              <th className="td-sheet-rownum" aria-label="Row" />
              <th className="td-sheet-sticky">Name</th>
              <th>Phone</th>
              <th>Gmail</th>
              <th>Location</th>
              <th>Activity</th>
              <th>Subscription</th>
              <th>Joined</th>
              <th>Last login</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data.users?.length ? (
              <tr><td className="td-sheet-empty" colSpan={9}>Loading…</td></tr>
            ) : null}
            {!loading && !data.users?.length ? (
              <tr><td className="td-sheet-empty" colSpan={9}>No users found.</td></tr>
            ) : null}
            {(data.users || []).map((user, i) => (
              <tr
                key={user.tenantId}
                tabIndex={0}
                onClick={() => onOpenUser?.(user.tenantId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpenUser?.(user.tenantId)
                }}
              >
                <td className="td-sheet-rownum">{((data.page || page) - 1) * 20 + i + 1}</td>
                <td className="td-sheet-sticky"><strong>{user.name || '—'}</strong></td>
                <td className="td-sheet-mono">{user.phone || ''}</td>
                <td>{user.email || ''}</td>
                <td>{user.location || ''}</td>
                <td>
                  <span className={`td-status ${user.activityStatus === 'active' ? 'td-status--converted' : 'td-status--not_interested'}`}>
                    {user.activityStatus === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  {user.subscriptionStatus === 'active'
                    ? `Active${user.subscriptionType ? ` (${user.subscriptionType})` : ''}`
                    : ''}
                </td>
                <td>{formatDate(user.createdAt)}</td>
                <td>{formatDate(user.lastLoginAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="td-sheet-foot">
        <span>{data.total || 0} users</span>
        <Pagination page={data.page || page} totalPages={data.totalPages || 1} onChange={setPage} />
      </div>
    </div>
  )
}

export function UserDetailSection({ token, tenantId, onBack, onAuthError }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const res = await adminFetch(`/api/admin/registered-users/${tenantId}`, { token })
        setDetail(res.user)
      } catch (err) {
        if (err.status === 401) onAuthError?.()
        else setError(err.message || 'Failed to load user')
      }
    })()
  }, [token, tenantId, onAuthError])

  if (error) {
    return (
      <div className="td-section">
        <button type="button" className="td-btn td-btn--ghost" onClick={onBack}>
          Back
        </button>
        <p className="td-error">{error}</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="td-section">
        <p className="td-muted">Loading user…</p>
      </div>
    )
  }

  const u = detail.user
  return (
    <div className="td-section">
      <div className="td-section-head">
        <div>
          <button type="button" className="td-btn td-btn--ghost" onClick={onBack}>
            ← Back
          </button>
          <h2>{u.name || 'User details'}</h2>
          <p className="td-muted">{u.email}</p>
        </div>
      </div>
      <div className="td-grid-2">
        <div className="td-card">
          <h3>Profile</h3>
          <dl className="td-dl">
            <div><dt>Phone</dt><dd>{u.phone || '—'}</dd></div>
            <div><dt>Location</dt><dd>{u.location || '—'}</dd></div>
            <div><dt>Status</dt><dd>{u.status || '—'}</dd></div>
            <div><dt>Activity</dt><dd>{u.activityStatus}</dd></div>
            <div><dt>Registered</dt><dd>{formatDate(u.createdAt)}</dd></div>
            <div><dt>Last login</dt><dd>{formatDate(u.lastLoginAt)}</dd></div>
            <div>
              <dt>Subscription</dt>
              <dd>
                {u.subscriptionStatus || 'none'}
                {u.subscriptionType ? ` / ${u.subscriptionType}` : ''}
              </dd>
            </div>
            <div>
              <dt>Activated</dt>
              <dd>{formatDate(u.subscriptionActivatedAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="td-card">
          <h3>Sessions</h3>
          <div className="td-card-list td-card-list--compact">
            {(detail.sessions || []).map((s) => (
              <div className="td-mini-row" key={s.sessionId}>
                <strong>{formatDate(s.startedAt)}</strong>
                <span>{s.device || '—'} / {s.browser || '—'}</span>
                <span className="td-meta">{s.path || '/'}</span>
              </div>
            ))}
            {!detail.sessions?.length ? <p className="td-muted">No sessions yet.</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export function VisitorsSection({ token, onAuthError }) {
  const [period, setPeriod] = useState('today')
  const [stats, setStats] = useState(null)
  const [visitors, setVisitors] = useState({ visitors: [], page: 1, totalPages: 1 })
  const [sessions, setSessions] = useState({ sessions: [], page: 1, totalPages: 1 })
  const [tab, setTab] = useState('overview')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    try {
      const [st, vis, sess] = await Promise.all([
        adminFetch(`/api/admin/analytics/visitors?period=${period}`, { token }),
        adminFetch(`/api/admin/visitors?page=${page}&pageSize=20`, { token }),
        adminFetch(`/api/admin/visitor-sessions?page=${page}&pageSize=20`, { token }),
      ])
      setStats(st)
      setVisitors(vis)
      setSessions(sess)
    } catch (err) {
      if (err.status === 401) onAuthError?.()
    }
  }, [token, period, page, onAuthError])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 25_000)
    return () => window.clearInterval(timer)
  }, [load])

  return (
    <div className="td-section">
      <div className="td-section-head">
        <div>
          <h2>Visitors</h2>
          <p className="td-muted">Anonymous website visitors (not signed in).</p>
        </div>
        <div className="td-segment">
          {['today', 'week', 'month'].map((p) => (
            <button
              key={p}
              type="button"
              className={period === p ? 'is-active' : ''}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <StatCards
        items={[
          { label: 'Unique visitors', value: stats?.uniqueVisitors ?? '—' },
          { label: 'Sessions', value: stats?.sessions ?? '—' },
          { label: 'Page views', value: stats?.pageViews ?? '—' },
          { label: 'New visitors', value: stats?.newVisitors ?? '—' },
          { label: 'Returning', value: stats?.returningVisitors ?? '—' },
        ]}
      />

      <div className="td-card">
        <h3>Visitor activity</h3>
        <SparkBars
          series={stats?.series || []}
          keys={['uniqueVisitors', 'sessions', 'pageViews']}
          labels={{
            uniqueVisitors: 'Unique',
            sessions: 'Sessions',
            pageViews: 'Page views',
          }}
        />
      </div>

      <div className="td-segment td-segment--block">
        <button type="button" className={tab === 'overview' ? 'is-active' : ''} onClick={() => setTab('overview')}>
          Visitors
        </button>
        <button type="button" className={tab === 'sessions' ? 'is-active' : ''} onClick={() => setTab('sessions')}>
          Sessions
        </button>
      </div>

      {tab === 'overview' ? (
        <div className="td-sheet-wrap">
          <table className="td-sheet">
            <thead>
              <SheetLetters count={6} stickyFirst={false} />
              <tr>
                <th className="td-sheet-rownum" aria-label="Row" />
                <th>Visitor ID</th>
                <th>Type</th>
                <th>First seen</th>
                <th>Last seen</th>
                <th className="td-sheet-num">Sessions</th>
                <th className="td-sheet-num">Page views</th>
              </tr>
            </thead>
            <tbody>
              {!visitors.visitors?.length ? (
                <tr><td className="td-sheet-empty" colSpan={7}>No visitors yet.</td></tr>
              ) : null}
              {(visitors.visitors || []).map((v, i) => (
                <tr key={v.visitorId}>
                  <td className="td-sheet-rownum">{((visitors.page || page) - 1) * 20 + i + 1}</td>
                  <td className="td-sheet-mono">{v.visitorId.slice(0, 18)}…</td>
                  <td>{v.isReturning ? 'Returning' : 'New'}</td>
                  <td>{formatDate(v.firstSeenAt)}</td>
                  <td>{formatDate(v.lastSeenAt)}</td>
                  <td className="td-sheet-num">{v.sessionCount}</td>
                  <td className="td-sheet-num">{v.pageViewCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="td-sheet-wrap">
          <table className="td-sheet">
            <thead>
              <SheetLetters count={6} stickyFirst={false} />
              <tr>
                <th className="td-sheet-rownum" aria-label="Row" />
                <th>Landing page</th>
                <th>Device</th>
                <th>Browser</th>
                <th>Started</th>
                <th className="td-sheet-num">Pages</th>
                <th>Engagement</th>
              </tr>
            </thead>
            <tbody>
              {!sessions.sessions?.length ? (
                <tr><td className="td-sheet-empty" colSpan={7}>No sessions yet.</td></tr>
              ) : null}
              {(sessions.sessions || []).map((s, i) => (
                <tr key={s.sessionId}>
                  <td className="td-sheet-rownum">{((sessions.page || page) - 1) * 20 + i + 1}</td>
                  <td>{s.landingPath || '/'}</td>
                  <td>{s.device || ''}</td>
                  <td>{s.browser || ''}</td>
                  <td>{formatDate(s.startedAt)}</td>
                  <td className="td-sheet-num">{s.pageCount}</td>
                  <td>{s.engaged ? 'Engaged' : 'Browse'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={tab === 'overview' ? visitors.page || page : sessions.page || page}
        totalPages={tab === 'overview' ? visitors.totalPages || 1 : sessions.totalPages || 1}
        onChange={setPage}
      />
    </div>
  )
}

export function ReportsSection({ token, onAuthError }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')

  async function runExport(preset) {
    setBusy(preset)
    setMessage('')
    try {
      await downloadUsersExport(token, {
        preset,
        from: preset === 'custom' ? from : undefined,
        to: preset === 'custom' ? to : undefined,
      })
      setMessage('Excel download started.')
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setMessage(err.message || 'Export failed')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="td-section">
      <div className="td-section-head">
        <div>
          <h2>Reports</h2>
          <p className="td-muted">Export registered users to Excel (.xlsx).</p>
        </div>
      </div>

      <div className="td-export-grid">
        <button type="button" className="td-btn td-btn--primary" disabled={!!busy} onClick={() => void runExport('today')}>
          {busy === 'today' ? 'Exporting…' : 'Export Today'}
        </button>
        <button type="button" className="td-btn td-btn--primary" disabled={!!busy} onClick={() => void runExport('week')}>
          {busy === 'week' ? 'Exporting…' : 'Export This Week'}
        </button>
        <button type="button" className="td-btn td-btn--primary" disabled={!!busy} onClick={() => void runExport('month')}>
          {busy === 'month' ? 'Exporting…' : 'Export This Month'}
        </button>
      </div>

      <div className="td-card">
        <h3>Custom Export</h3>
        <div className="td-filters">
          <input className="td-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="td-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button
            type="button"
            className="td-btn td-btn--ghost"
            disabled={!!busy || !from || !to}
            onClick={() => void runExport('custom')}
          >
            {busy === 'custom' ? 'Exporting…' : 'Custom Export'}
          </button>
        </div>
        {message ? <p className="td-success">{message}</p> : null}
      </div>
    </div>
  )
}

export function SettingsSection({ token, onAuthError }) {
  const [amountRupees, setAmountRupees] = useState('1')
  const [meta, setMeta] = useState(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await adminFetch('/api/admin/settings', { token })
        setAmountRupees(String(res.settings?.amountRupees ?? 1))
        setMeta(res.settings || null)
      } catch (err) {
        if (err.status === 401) onAuthError?.()
      }
    })()
  }, [token, onAuthError])

  async function onSave(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await adminFetch('/api/admin/settings', {
        token,
        method: 'PUT',
        body: { amountRupees: Number(amountRupees) },
      })
      setMeta(res.settings)
      setMessage(res.message || 'Saved.')
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setMessage(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="td-section">
      <div className="td-section-head">
        <div>
          <h2>Settings</h2>
          <p className="td-muted">Subscription price updates the live site in seconds.</p>
        </div>
      </div>
      <form className="td-card" onSubmit={onSave}>
        <label className="td-label" htmlFor="td-price">Subscription price (₹)</label>
        <input
          id="td-price"
          className="td-input"
          type="number"
          min="1"
          step="0.01"
          value={amountRupees}
          onChange={(e) => setAmountRupees(e.target.value)}
          required
        />
        {meta?.updatedAt ? <p className="td-meta">Last updated {formatDate(meta.updatedAt)}</p> : null}
        {message ? <p className="td-success">{message}</p> : null}
        <button className="td-btn td-btn--primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  )
}
