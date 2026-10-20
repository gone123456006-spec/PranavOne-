import { useCallback, useEffect, useState } from 'react'
import {
  Copy,
  Eye,
  FileArrowDown,
  Phone,
  Printer,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react'
import { adminFetch, downloadUsersExport, formatDate } from './adminApi.js'
import { Pagination, SheetLetters, SparkBars, StatCards, downloadCsv } from './ui.jsx'

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
  const [admissionFeeRupees, setAdmissionFeeRupees] = useState('8000')
  const [admissionOriginalFeeRupees, setAdmissionOriginalFeeRupees] = useState('12000')
  const [meta, setMeta] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await adminFetch('/api/admin/settings', { token })
        setAmountRupees(String(res.settings?.amountRupees ?? 1))
        setAdmissionFeeRupees(String(res.settings?.admissionFeeRupees ?? 8000))
        setAdmissionOriginalFeeRupees(String(res.settings?.admissionOriginalFeeRupees ?? 12000))
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
    setError('')
    try {
      const res = await adminFetch('/api/admin/settings', {
        token,
        method: 'PUT',
        body: {
          amountRupees: Number(amountRupees),
          admissionFeeRupees: Number(admissionFeeRupees),
          admissionOriginalFeeRupees: Number(admissionOriginalFeeRupees),
        },
      })
      setMeta(res.settings)
      setMessage(res.message || 'Settings saved. Changes are now live.')
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const admFeeNum = Number(admissionFeeRupees) || 0
  const admOrigNum = Number(admissionOriginalFeeRupees) || 0
  const discountPercent =
    admOrigNum > admFeeNum && admOrigNum > 0
      ? Math.round(((admOrigNum - admFeeNum) / admOrigNum) * 100)
      : 0

  return (
    <div className="td-section">
      <div className="td-section-head">
        <div>
          <h2>Settings &amp; Pricing</h2>
          <p className="td-muted">
            Adjust the course admission fee and subscription price. Changes update live across the website and Razorpay checkout.
          </p>
        </div>
      </div>

      <form className="td-card" onSubmit={onSave} style={{ maxWidth: '640px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 600 }}>
          Course Admission Pricing (TallyPrime + Accounting)
        </h3>
        <p className="td-muted" style={{ margin: '0 0 16px', fontSize: '0.84rem' }}>
          This controls the actual Razorpay order charge amount and the strike-through discount displayed on the admission form.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label className="td-label" htmlFor="td-adm-fee" style={{ fontWeight: 600 }}>
              Offer Admission Fee (₹) <span style={{ color: 'var(--td-accent, #1f7a4d)' }}>*Actual Charge</span>
            </label>
            <input
              id="td-adm-fee"
              className="td-input"
              type="number"
              min="1"
              max="100000"
              step="1"
              value={admissionFeeRupees}
              onChange={(e) => setAdmissionFeeRupees(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.78rem', color: '#666' }}>Amount collected via Razorpay</span>
          </div>

          <div>
            <label className="td-label" htmlFor="td-adm-orig" style={{ fontWeight: 600 }}>
              Original Course Fee (₹) <span style={{ color: '#888' }}>*Strike-through</span>
            </label>
            <input
              id="td-adm-orig"
              className="td-input"
              type="number"
              min="1"
              max="100000"
              step="1"
              value={admissionOriginalFeeRupees}
              onChange={(e) => setAdmissionOriginalFeeRupees(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.78rem', color: '#666' }}>Displayed with strike-through</span>
          </div>
        </div>

        {discountPercent > 0 ? (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: '#e8f5e9',
              color: '#1b5e20',
              fontSize: '0.82rem',
              fontWeight: 500,
              marginBottom: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🎉 Special discount offer:</span>
            <strong>{discountPercent}% OFF</strong>
            <span>(Students save ₹{(admOrigNum - admFeeNum).toLocaleString('en-IN')})</span>
          </div>
        ) : null}

        <hr style={{ border: 'none', borderTop: '1px solid var(--td-line, #e1dfdd)', margin: '16px 0 20px' }} />

        <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 600 }}>
          Workshop / Trial Subscription Price
        </h3>
        <p className="td-muted" style={{ margin: '0 0 16px', fontSize: '0.84rem' }}>
          Controls the trial / subscription price across the website.
        </p>

        <div style={{ maxWidth: '280px', marginBottom: '16px' }}>
          <label className="td-label" htmlFor="td-price" style={{ fontWeight: 600 }}>
            Subscription price (₹)
          </label>
          <input
            id="td-price"
            className="td-input"
            type="number"
            min="1"
            max="100000"
            step="0.01"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            required
          />
        </div>

        {meta?.updatedAt ? (
          <p className="td-meta" style={{ marginTop: '12px' }}>
            Last updated {formatDate(meta.updatedAt)} ({meta.source === 'mongodb' ? 'Saved in database' : 'Default from env'})
          </p>
        ) : null}

        {error ? <p className="td-error" style={{ color: '#d13438', marginTop: '10px' }}>{error}</p> : null}
        {message ? <p className="td-success" style={{ color: '#107c41', marginTop: '10px' }}>{message}</p> : null}

        <button className="td-btn td-btn--primary" type="submit" disabled={saving}>
          {saving ? 'Saving changes…' : 'Save all settings'}
        </button>
      </form>
    </div>
  )
}

const ADMISSION_STATUS_LABELS = {
  created: 'Pending payment',
  paid: 'Paid',
  failed: 'Failed',
}

export function AdmissionsSection({ token, onAuthError }) {
  const [data, setData] = useState({
    admissions: [],
    page: 1,
    totalPages: 1,
    total: 0,
    stats: { paidCount: 0, paidAmountLabel: '₹0' },
  })
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [courseMode, setCourseMode] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedAdmission, setSelectedAdmission] = useState(null)
  const [copiedKey, setCopiedKey] = useState('')

  function copyText(key, text) {
    if (!text) return
    void navigator.clipboard?.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 2000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q,
        status,
        page: String(page),
        pageSize: '20',
      })
      if (courseMode) params.set('courseMode', courseMode)
      const res = await adminFetch(`/api/admin/admissions?${params}`, { token })
      setData(res)
      setError('')
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Failed to load admissions')
    } finally {
      setLoading(false)
    }
  }, [token, q, status, courseMode, page, onAuthError])

  useEffect(() => {
    void load()
  }, [load])

  function exportAdmissionsCsv() {
    const rows = data.admissions || []
    if (!rows.length) return
    const columns = [
      { label: 'Admission Number', value: (r) => r.admissionNumber || '' },
      { label: 'Candidate Name', value: (r) => r.name || '' },
      { label: 'Mobile Number', value: (r) => r.phone || '' },
      { label: 'Email', value: (r) => r.email || '' },
      { label: 'Course Mode', value: (r) => r.courseModeLabel || r.courseMode || '' },
      { label: 'Fee Amount', value: (r) => r.amountLabel || '₹8,000' },
      { label: 'Status', value: (r) => ADMISSION_STATUS_LABELS[r.status] || r.status || '' },
      { label: 'Razorpay Payment ID', value: (r) => r.razorpayPaymentId || '' },
      { label: 'Razorpay Order ID', value: (r) => r.razorpayOrderId || '' },
      { label: 'Paid At', value: (r) => (r.paidAt ? formatDate(r.paidAt) : '') },
      { label: 'Submitted At', value: (r) => formatDate(r.createdAt) },
    ]
    const dateStr = new Date().toISOString().slice(0, 10)
    downloadCsv(`admissions_${dateStr}.csv`, columns, rows)
  }

  const statsItems = [
    { label: 'Total Admissions', value: data.total || 0 },
    {
      label: 'Paid Admissions',
      value: data.stats?.paidCount || 0,
      hint: `${Math.round(((data.stats?.paidCount || 0) / Math.max(1, data.total || 1)) * 100)}% conversion`,
    },
    { label: 'Fee Collected', value: data.stats?.paidAmountLabel || '₹0' },
    {
      label: 'Online vs Offline',
      value: `${(data.admissions || []).filter((a) => a.courseMode === 'online').length} / ${(data.admissions || []).filter((a) => a.courseMode === 'offline').length}`,
      hint: 'Current page split',
    },
  ]

  return (
    <div className="td-section">
      <div className="td-section-head">
        <div>
          <h2>Admissions</h2>
          <p className="td-muted">
            Home-page course admission registrations &amp; payments · {data.stats?.paidCount || 0} paid ·{' '}
            {data.stats?.paidAmountLabel || '₹0'} collected
          </p>
        </div>
        <div className="td-quick-links">
          <button
            type="button"
            className="td-btn td-btn--ghost"
            onClick={exportAdmissionsCsv}
            disabled={!(data.admissions || []).length}
            title="Download Admissions CSV"
          >
            <FileArrowDown size={16} /> Export CSV
          </button>
          <button type="button" className="td-btn td-btn--ghost" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </div>

      <StatCards items={statsItems} />

      <div className="td-filters">
        <input
          className="td-input"
          type="search"
          placeholder="Search by Admission No (ADM-…), name, mobile, email, payment ID…"
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
        />
        <select
          className="td-input"
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        >
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="created">Pending payment</option>
          <option value="failed">Failed</option>
        </select>
        <select
          className="td-input"
          value={courseMode}
          onChange={(e) => {
            setPage(1)
            setCourseMode(e.target.value)
          }}
        >
          <option value="">All modes</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {error ? <p className="td-error">{error}</p> : null}
      {loading ? <p className="td-muted">Loading admissions…</p> : null}

      <div className="td-sheet-wrap">
        <table className="td-sheet">
          <thead>
            <tr>
              <th className="td-sheet-rownum">#</th>
              <th>Admission No.</th>
              <th>Candidate</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Mode</th>
              <th>Fee</th>
              <th>Status</th>
              <th>Payment ID</th>
              <th>Order ID</th>
              <th>Paid at</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data.admissions || []).length === 0 ? (
              <tr>
                <td colSpan={13} className="td-empty">
                  No admissions found matching current filter.
                </td>
              </tr>
            ) : (
              data.admissions.map((row, idx) => (
                <tr key={row.id}>
                  <td className="td-sheet-rownum">{((data.page || page) - 1) * 20 + idx + 1}</td>
                  <td>
                    <button
                      type="button"
                      className="td-copy-inline td-admission-chip"
                      onClick={() => copyText(`adm-${row.id}`, row.admissionNumber)}
                      title="Click to copy Admission Number"
                    >
                      {row.admissionNumber || 'ADM-—'}
                      <Copy size={12} />
                    </button>
                    {copiedKey === `adm-${row.id}` ? (
                      <span style={{ fontSize: '10px', color: '#15803d', display: 'block' }}>
                        Copied!
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td>
                    <div className="td-quick-links">
                      <span>{row.phone}</span>
                      {row.phone ? (
                        <>
                          <a
                            href={`https://wa.me/91${row.phone}?text=${encodeURIComponent(`Hello ${row.name}, regarding your Pranav One admission (${row.admissionNumber || ''})…`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="td-icon-btn td-icon-btn--wa"
                            title="Chat on WhatsApp"
                          >
                            <WhatsappLogo size={14} />
                          </a>
                          <a
                            href={`tel:+91${row.phone}`}
                            className="td-icon-btn"
                            title="Call Candidate"
                          >
                            <Phone size={14} />
                          </a>
                        </>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    {row.email ? (
                      <a href={`mailto:${row.email}`} className="td-meta" style={{ color: 'inherit' }}>
                        {row.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className={`td-mode-chip td-mode-chip--${row.courseMode}`}>
                      {row.courseModeLabel || row.courseMode}
                    </span>
                  </td>
                  <td>
                    <strong>{row.amountLabel}</strong>
                  </td>
                  <td>
                    <span
                      className={`td-pay-status td-pay-status--${row.status === 'paid' ? 'paid' : row.status === 'failed' ? 'unpaid' : 'partial'}`}
                    >
                      {ADMISSION_STATUS_LABELS[row.status] || row.status}
                    </span>
                  </td>
                  <td className="td-sheet-note">
                    {row.razorpayPaymentId ? (
                      <button
                        type="button"
                        className="td-copy-inline td-sheet-mono"
                        onClick={() => copyText(`pay-${row.id}`, row.razorpayPaymentId)}
                        title={`Copy ${row.razorpayPaymentId}`}
                      >
                        {row.razorpayPaymentId.slice(0, 14)}…
                        <Copy size={11} />
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="td-sheet-note td-sheet-mono" title={row.razorpayOrderId || ''}>
                    {row.razorpayOrderId ? `${row.razorpayOrderId.slice(0, 12)}…` : '—'}
                  </td>
                  <td>{row.paidAt ? formatDate(row.paidAt) : '—'}</td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="td-btn td-btn--ghost"
                      style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                      onClick={() => setSelectedAdmission(row)}
                      title="View all details"
                    >
                      <Eye size={13} style={{ marginRight: 4 }} /> Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={data.page || page}
        totalPages={data.totalPages || 1}
        onChange={setPage}
      />

      {/* Admission Full Details Modal */}
      {selectedAdmission ? (
        <div
          className="td-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedAdmission(null)}
        >
          <div className="td-modal" onClick={(e) => e.stopPropagation()}>
            <div className="td-modal-head">
              <div>
                <h3>Admission Slip &amp; Details</h3>
                <p className="td-muted" style={{ margin: 0, fontSize: '0.82rem' }}>
                  Student Enrollment Record · {selectedAdmission.courseModeLabel || selectedAdmission.courseMode}
                </p>
              </div>
              <button
                type="button"
                className="td-modal-close"
                onClick={() => setSelectedAdmission(null)}
                aria-label="Close details"
              >
                <X size={16} />
              </button>
            </div>

            <div className="td-modal-body">
              <div className="td-slip-banner">
                <div>
                  <div className="td-slip-num-title">Official Admission Number</div>
                  <div className="td-slip-num">{selectedAdmission.admissionNumber || 'ADM-—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    className={`td-pay-status td-pay-status--${selectedAdmission.status === 'paid' ? 'paid' : selectedAdmission.status === 'failed' ? 'unpaid' : 'partial'}`}
                    style={{ fontSize: '0.85rem', padding: '4px 10px' }}
                  >
                    {ADMISSION_STATUS_LABELS[selectedAdmission.status] || selectedAdmission.status}
                  </span>
                  <div style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      className="td-btn td-btn--ghost"
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      onClick={() => copyText('modal-adm', selectedAdmission.admissionNumber)}
                    >
                      <Copy size={12} /> {copiedKey === 'modal-adm' ? 'Copied!' : 'Copy Number'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="td-detail-section">
                <h4>Candidate Information</h4>
                <div className="td-detail-grid">
                  <div className="td-detail-item">
                    <span className="td-detail-k">Full Name</span>
                    <span className="td-detail-v">{selectedAdmission.name}</span>
                  </div>
                  <div className="td-detail-item">
                    <span className="td-detail-k">Mobile Number</span>
                    <div className="td-quick-links" style={{ marginTop: 2 }}>
                      <span className="td-detail-v">+91 {selectedAdmission.phone}</span>
                      <a
                        href={`https://wa.me/91${selectedAdmission.phone}?text=${encodeURIComponent(`Hello ${selectedAdmission.name}, regarding your Pranav One admission (${selectedAdmission.admissionNumber || ''})…`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="td-icon-btn td-icon-btn--wa"
                        title="Chat on WhatsApp"
                      >
                        <WhatsappLogo size={14} />
                      </a>
                      <a
                        href={`tel:+91${selectedAdmission.phone}`}
                        className="td-icon-btn"
                        title="Call Candidate"
                      >
                        <Phone size={14} />
                      </a>
                    </div>
                  </div>
                  <div className="td-detail-item td-detail-item--full">
                    <span className="td-detail-k">Gmail / Email</span>
                    <span className="td-detail-v">
                      <a
                        href={`mailto:${selectedAdmission.email}`}
                        style={{ color: '#166534', textDecoration: 'underline' }}
                      >
                        {selectedAdmission.email}
                      </a>
                    </span>
                  </div>
                </div>
              </div>

              <div className="td-detail-section">
                <h4>Course Enrollment</h4>
                <div className="td-detail-grid">
                  <div className="td-detail-item">
                    <span className="td-detail-k">Course</span>
                    <span className="td-detail-v">TallyPrime &amp; Computer Course</span>
                  </div>
                  <div className="td-detail-item">
                    <span className="td-detail-k">Learning Mode</span>
                    <span className="td-detail-v">
                      <span className={`td-mode-chip td-mode-chip--${selectedAdmission.courseMode}`}>
                        {selectedAdmission.courseModeLabel || selectedAdmission.courseMode}
                      </span>
                    </span>
                  </div>
                  <div className="td-detail-item">
                    <span className="td-detail-k">Duration</span>
                    <span className="td-detail-v">3 Months</span>
                  </div>
                  <div className="td-detail-item">
                    <span className="td-detail-k">Placement Assistance</span>
                    <span className="td-detail-v">100% Job Assistance</span>
                  </div>
                </div>
              </div>

              <div className="td-detail-section">
                <h4>Payment &amp; Transaction</h4>
                <div className="td-detail-grid">
                  <div className="td-detail-item">
                    <span className="td-detail-k">Amount Charged</span>
                    <span className="td-detail-v" style={{ color: '#15803d', fontSize: '1.05rem' }}>
                      {selectedAdmission.amountLabel}
                    </span>
                  </div>
                  <div className="td-detail-item">
                    <span className="td-detail-k">Payment Status</span>
                    <span className="td-detail-v">
                      {selectedAdmission.status === 'paid' ? 'Completed (Razorpay)' : selectedAdmission.status}
                    </span>
                  </div>
                  <div className="td-detail-item td-detail-item--full">
                    <span className="td-detail-k">Razorpay Payment ID</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="td-detail-v td-sheet-mono" style={{ fontSize: '0.85rem' }}>
                        {selectedAdmission.razorpayPaymentId || '—'}
                      </span>
                      {selectedAdmission.razorpayPaymentId ? (
                        <button
                          type="button"
                          className="td-copy-inline"
                          onClick={() => copyText('modal-pay', selectedAdmission.razorpayPaymentId)}
                        >
                          <Copy size={13} /> {copiedKey === 'modal-pay' ? 'Copied' : ''}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="td-detail-item td-detail-item--full">
                    <span className="td-detail-k">Razorpay Order ID</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="td-detail-v td-sheet-mono" style={{ fontSize: '0.85rem' }}>
                        {selectedAdmission.razorpayOrderId || '—'}
                      </span>
                      {selectedAdmission.razorpayOrderId ? (
                        <button
                          type="button"
                          className="td-copy-inline"
                          onClick={() => copyText('modal-order', selectedAdmission.razorpayOrderId)}
                        >
                          <Copy size={13} /> {copiedKey === 'modal-order' ? 'Copied' : ''}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="td-detail-item">
                    <span className="td-detail-k">Paid Timestamp</span>
                    <span className="td-detail-v">
                      {selectedAdmission.paidAt ? formatDate(selectedAdmission.paidAt) : '—'}
                    </span>
                  </div>
                  <div className="td-detail-item">
                    <span className="td-detail-k">Form Submitted</span>
                    <span className="td-detail-v">{formatDate(selectedAdmission.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="td-modal-foot">
              <button
                type="button"
                className="td-btn td-btn--ghost"
                onClick={() => window.print()}
              >
                <Printer size={15} style={{ marginRight: 4 }} /> Print Slip
              </button>
              <button
                type="button"
                className="td-btn td-btn--primary"
                onClick={() => setSelectedAdmission(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
