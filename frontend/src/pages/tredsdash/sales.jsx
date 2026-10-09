import { useCallback, useEffect, useState } from 'react'
import {
  ArrowClockwise,
  Bell,
  ClockCounterClockwise,
  Phone,
  Trash,
  WhatsappLogo,
} from '@phosphor-icons/react'
import { adminFetch, formatDate } from './adminApi.js'
import { Pagination, StatCards } from './ui.jsx'

const DEFAULT_BATCH = '19 October 2026'

const STATUS_LABELS = {
  not_called: 'Not called',
  pending: 'Pending',
  recall_later: 'Recall later',
  not_picked: 'Not picked up',
  converted: 'Converted',
  not_interested: 'Not interested',
}

const OUTCOME_LABELS = {
  connected: 'Connected',
  busy: 'Busy',
  not_picked: 'Not picked up',
  call_later: 'Call later',
}

const OUTCOME_OPTIONS = [
  { id: 'connected', label: 'Connected / Done' },
  { id: 'busy', label: 'Busy' },
  { id: 'not_picked', label: 'Not picked up' },
  { id: 'call_later', label: 'Call later' },
]

const CONNECTED_STATUS_OPTIONS = [
  { id: 'converted', label: 'Lead converted' },
  { id: 'pending', label: 'Pending' },
  { id: 'recall_later', label: 'Recall later' },
  { id: 'not_interested', label: 'Not interested' },
]

const FOLLOWUP_TABS = [
  { id: 'due', label: 'Due today' },
  { id: 'all', label: 'All' },
  { id: 'not_called', label: 'Not called' },
  { id: 'pending', label: 'Pending' },
  { id: 'recall_later', label: 'Recall later' },
  { id: 'not_picked', label: 'Not picked up' },
  { id: 'not_interested', label: 'Not interested' },
]

const STAGES = [
  { id: 'sales-add', step: 1, label: 'Add Lead' },
  { id: 'sales-followup', step: 2, label: 'Follow-ups' },
  { id: 'sales-converted', step: 3, label: 'Converted' },
]

function toLocalInput(date) {
  const d = new Date(date)
  d.setSeconds(0, 0)
  const offset = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

function quickReminder(kind) {
  const d = new Date()
  if (kind === '1h') d.setHours(d.getHours() + 1)
  if (kind === 'evening') d.setHours(18, 0, 0, 0)
  if (kind === 'tomorrow') {
    d.setDate(d.getDate() + 1)
    d.setHours(11, 0, 0, 0)
  }
  if (kind === '2d') {
    d.setDate(d.getDate() + 2)
    d.setHours(11, 0, 0, 0)
  }
  return toLocalInput(d)
}

function toIso(localValue) {
  return localValue ? new Date(localValue).toISOString() : null
}

function needsReminder(outcome, status) {
  return outcome === 'call_later' || (outcome === 'connected' && status === 'recall_later')
}

/** Shows where the lead will land so the caller knows what Save does. */
function destinationLabel(outcome, status) {
  if (!outcome) return 'Stage 2 · Not called'
  if (outcome === 'busy' || outcome === 'not_picked') return 'Stage 2 · Not picked up'
  if (outcome === 'call_later') return 'Stage 2 · Recall later'
  if (status === 'converted') return 'Stage 3 · Converted'
  return `Stage 2 · ${STATUS_LABELS[status] || 'Pending'}`
}

function useLeadStats(token, onAuthError, refreshKey) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await adminFetch('/api/admin/leads/stats', { token })
        if (!cancelled) {
          setStats(res.stats)
          setError('')
        }
      } catch (err) {
        if (err.status === 401) onAuthError?.()
        else if (!cancelled) setError(err.message || 'Failed to load sales stats')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, onAuthError, refreshKey])
  return { stats, error }
}

function Chips({ options, value, onChange, name }) {
  return (
    <div className="td-chips" role="radiogroup" aria-label={name}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          className={`td-chip td-chip--${opt.id} ${value === opt.id ? 'is-active' : ''}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function ReminderPicker({ value, onChange, required }) {
  return (
    <div className="td-reminder">
      <input
        className="td-input"
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      <div className="td-reminder-quick">
        <button type="button" onClick={() => onChange(quickReminder('1h'))}>+1 hour</button>
        <button type="button" onClick={() => onChange(quickReminder('evening'))}>This evening</button>
        <button type="button" onClick={() => onChange(quickReminder('tomorrow'))}>Tomorrow 11 AM</button>
        <button type="button" onClick={() => onChange(quickReminder('2d'))}>In 2 days</button>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  return <span className={`td-status td-status--${status}`}>{STATUS_LABELS[status] || status}</span>
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function StageStepper({ current, stats, onGo }) {
  const counts = {
    'sales-add': stats ? `${stats.addedToday} today` : '',
    'sales-followup': stats ? `${stats.followUps} open` : '',
    'sales-converted': stats ? `${stats.counts.converted} won` : '',
  }
  return (
    <ol className="td-stepper">
      {STAGES.map((stage) => (
        <li key={stage.id}>
          <button
            type="button"
            className={current === stage.id ? 'is-active' : ''}
            onClick={() => onGo?.(stage.id)}
          >
            <span className="td-stepper-num">{stage.step}</span>
            <span className="td-stepper-text">
              <strong>{stage.label}</strong>
              <small>{counts[stage.id]}</small>
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}

function AddLeadStage({ token, onAuthError, stats, onSaved }) {
  const empty = {
    name: '',
    phone: '',
    email: '',
    batch: DEFAULT_BATCH,
    note: '',
    outcome: '',
    status: 'pending',
    reminder: '',
  }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [syncMsg, setSyncMsg] = useState('')

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const reminderNeeded = needsReminder(form.outcome, form.status)
  const showReminder =
    reminderNeeded || form.outcome !== 'connected' || form.status === 'pending'

  async function onSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await adminFetch('/api/admin/leads', {
        token,
        method: 'POST',
        body: {
          name: form.name,
          phone: form.phone,
          email: form.email,
          batch: form.batch,
          note: form.note,
          outcome: form.outcome || undefined,
          status: form.outcome === 'connected' ? form.status : undefined,
          reminderAt: showReminder ? toIso(form.reminder) : null,
        },
      })
      setMessage(
        `${res.lead.name} saved → ${destinationLabel(form.outcome, form.status)}`,
      )
      setForm({ ...empty, batch: form.batch })
      onSaved?.()
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Could not save lead')
    } finally {
      setSaving(false)
    }
  }

  async function syncWebsite() {
    setSyncMsg('Importing…')
    try {
      const res = await adminFetch('/api/admin/leads/sync-website', { token, method: 'POST' })
      setSyncMsg(
        res.added
          ? `${res.added} new website sign-up${res.added === 1 ? '' : 's'} added to Stage 2 · Not called.`
          : 'All website sign-ups are already in the pipeline.',
      )
      onSaved?.()
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setSyncMsg(err.message || 'Import failed')
    }
  }

  const batchOptions = Array.from(new Set([DEFAULT_BATCH, ...(stats?.batches || [])]))

  return (
    <div className="td-sales-grid">
      <form className="td-card td-lead-form" onSubmit={onSubmit}>
        <h3>New lead</h3>
        <div className="td-form-row">
          <div>
            <label className="td-label" htmlFor="lead-name">Name *</label>
            <input id="lead-name" className="td-input" value={form.name} onChange={(e) => set('name')(e.target.value)} required minLength={2} placeholder="Full name" />
          </div>
          <div>
            <label className="td-label" htmlFor="lead-phone">Phone number *</label>
            <input id="lead-phone" className="td-input" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => set('phone')(e.target.value)} required placeholder="10-digit mobile" />
          </div>
        </div>
        <div className="td-form-row">
          <div>
            <label className="td-label" htmlFor="lead-email">Gmail ID <span className="td-optional">(optional)</span></label>
            <input id="lead-email" className="td-input" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} placeholder="name@gmail.com" />
          </div>
          <div>
            <label className="td-label" htmlFor="lead-batch">Which batch</label>
            <input id="lead-batch" className="td-input" list="lead-batches" value={form.batch} onChange={(e) => set('batch')(e.target.value)} placeholder="e.g. 19 October 2026" />
            <datalist id="lead-batches">
              {batchOptions.map((b) => <option key={b} value={b} />)}
            </datalist>
          </div>
        </div>

        <label className="td-label" htmlFor="lead-note">Conversation notes</label>
        <textarea id="lead-note" className="td-input td-textarea" rows={3} value={form.note} onChange={(e) => set('note')(e.target.value)} placeholder="What did the lead say? Interest, fee questions, best time to call…" />

        <p className="td-label">Call result</p>
        <Chips
          name="Call result"
          value={form.outcome}
          onChange={set('outcome')}
          options={[{ id: '', label: 'Not called yet' }, ...OUTCOME_OPTIONS]}
        />

        {form.outcome === 'connected' ? (
          <>
            <p className="td-label">Lead status</p>
            <Chips name="Lead status" value={form.status} onChange={set('status')} options={CONNECTED_STATUS_OPTIONS} />
          </>
        ) : null}

        {showReminder ? (
          <>
            <label className="td-label">
              Reminder {reminderNeeded ? '*' : <span className="td-optional">(optional)</span>}
            </label>
            <ReminderPicker value={form.reminder} onChange={set('reminder')} required={reminderNeeded} />
          </>
        ) : null}

        <div className="td-form-foot">
          <span className="td-dest">Goes to: <strong>{destinationLabel(form.outcome, form.status)}</strong></span>
          <button className="td-btn td-btn--primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save lead'}
          </button>
        </div>
        {message ? <p className="td-success">{message}</p> : null}
        {error ? <p className="td-error">{error}</p> : null}
      </form>

      <aside className="td-sales-side">
        <div className="td-card">
          <h3>Website sign-ups</h3>
          <p className="td-muted">
            Everyone who fills the Get Started form is added automatically to
            Stage 2 · Not called. Import older sign-ups once:
          </p>
          <button type="button" className="td-btn td-btn--ghost td-btn--block" onClick={() => void syncWebsite()}>
            Import website sign-ups
          </button>
          {syncMsg ? <p className="td-success">{syncMsg}</p> : null}
        </div>
      </aside>
    </div>
  )
}

function LogCallPanel({ lead, token, onAuthError, onDone, onCancel }) {
  const [outcome, setOutcome] = useState('connected')
  const [status, setStatus] = useState('pending')
  const [note, setNote] = useState('')
  const [reminder, setReminder] = useState(lead.reminderAt ? toLocalInput(lead.reminderAt) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const reminderNeeded = needsReminder(outcome, status)
  const showReminder = reminderNeeded || outcome !== 'connected' || status === 'pending'

  async function onSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await adminFetch(`/api/admin/leads/${lead.id}/calls`, {
        token,
        method: 'POST',
        body: {
          outcome,
          status: outcome === 'connected' ? status : undefined,
          note,
          reminderAt: showReminder ? toIso(reminder) : null,
        },
      })
      onDone?.(res.lead)
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Could not save call')
      setSaving(false)
    }
  }

  return (
    <form className="td-lead-panel" onSubmit={onSubmit}>
      <p className="td-label">Call result</p>
      <Chips name="Call result" value={outcome} onChange={setOutcome} options={OUTCOME_OPTIONS} />
      {outcome === 'connected' ? (
        <>
          <p className="td-label">Lead status</p>
          <Chips name="Lead status" value={status} onChange={setStatus} options={CONNECTED_STATUS_OPTIONS} />
        </>
      ) : null}
      <label className="td-label">Notes</label>
      <textarea className="td-input td-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened on this call?" />
      {showReminder ? (
        <>
          <label className="td-label">
            Next reminder {reminderNeeded ? '*' : <span className="td-optional">(optional)</span>}
          </label>
          <ReminderPicker value={reminder} onChange={setReminder} required={reminderNeeded} />
        </>
      ) : null}
      {error ? <p className="td-error">{error}</p> : null}
      <div className="td-form-foot">
        <span className="td-dest">Goes to: <strong>{destinationLabel(outcome, status)}</strong></span>
        <div className="td-inline-actions">
          <button type="button" className="td-btn td-btn--ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="td-btn td-btn--primary td-btn--flat" disabled={saving}>
            {saving ? 'Saving…' : 'Save call'}
          </button>
        </div>
      </div>
    </form>
  )
}

function ReminderPanel({ lead, token, onAuthError, onDone, onCancel }) {
  const [value, setValue] = useState(lead.reminderAt ? toLocalInput(lead.reminderAt) : quickReminder('tomorrow'))
  const [error, setError] = useState('')

  async function save(reminderAt) {
    try {
      const res = await adminFetch(`/api/admin/leads/${lead.id}`, {
        token,
        method: 'PATCH',
        body: { reminderAt },
      })
      onDone?.(res.lead)
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Could not save reminder')
    }
  }

  return (
    <div className="td-lead-panel">
      <p className="td-label">Remind me to call</p>
      <ReminderPicker value={value} onChange={setValue} required />
      {error ? <p className="td-error">{error}</p> : null}
      <div className="td-inline-actions">
        {lead.reminderAt ? (
          <button type="button" className="td-btn td-btn--ghost" onClick={() => void save(null)}>Clear</button>
        ) : null}
        <button type="button" className="td-btn td-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="td-btn td-btn--primary td-btn--flat" disabled={!value} onClick={() => void save(toIso(value))}>
          Save reminder
        </button>
      </div>
    </div>
  )
}

function LeadCard({ lead, token, onAuthError, onChanged, converted = false }) {
  const [panel, setPanel] = useState('')
  const [busy, setBusy] = useState(false)
  const overdue = lead.reminderAt && new Date(lead.reminderAt) < new Date()

  async function setStatus(status) {
    setBusy(true)
    try {
      await adminFetch(`/api/admin/leads/${lead.id}`, { token, method: 'PATCH', body: { status } })
      onChanged?.()
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete lead ${lead.name}? This cannot be undone.`)) return
    try {
      await adminFetch(`/api/admin/leads/${lead.id}`, { token, method: 'DELETE' })
      onChanged?.()
    } catch (err) {
      if (err.status === 401) onAuthError?.()
    }
  }

  const done = () => {
    setPanel('')
    onChanged?.()
  }

  return (
    <article className="td-lead">
      <div className="td-lead-top">
        <span className="td-avatar" aria-hidden="true">{initials(lead.name)}</span>
        <div className="td-lead-head">
          <strong>{lead.name}</strong>
          <span>
            {lead.phone}
            {lead.batch ? ` · ${lead.batch}` : ''}
            {lead.source === 'website' ? ' · Website' : ''}
          </span>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <div className="td-lead-facts">
        {lead.email ? <span>{lead.email}</span> : null}
        <span>{lead.attempts} call{lead.attempts === 1 ? '' : 's'}</span>
        {lead.lastOutcome ? (
          <span>
            {OUTCOME_LABELS[lead.lastOutcome]}, {formatDate(lead.lastCalledAt)}
          </span>
        ) : null}
        {converted ? (
          <span>Converted {formatDate(lead.convertedAt)}</span>
        ) : lead.reminderAt ? (
          <span className={overdue ? 'td-overdue' : 'td-reminder-tag'}>
            <Bell size={14} weight="fill" aria-hidden="true" />
            {overdue ? 'Overdue, ' : ''}
            {formatDate(lead.reminderAt)}
          </span>
        ) : null}
      </div>

      {lead.lastNote ? <p className="td-lead-note">{lead.lastNote}</p> : null}

      <div className="td-lead-actions">
        <a className="td-round-btn td-round-btn--call" href={`tel:+91${lead.phone}`} aria-label={`Call ${lead.name}`}>
          <Phone size={18} weight="fill" aria-hidden="true" />
        </a>
        <a
          className="td-round-btn td-round-btn--wa"
          href={`https://wa.me/91${lead.phone}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`WhatsApp ${lead.name}`}
        >
          <WhatsappLogo size={18} weight="fill" aria-hidden="true" />
        </a>
        <button
          type="button"
          className={`td-round-btn ${panel === 'history' ? 'is-active' : ''}`}
          onClick={() => setPanel(panel === 'history' ? '' : 'history')}
          aria-label="Call history"
          title="Call history"
        >
          <ClockCounterClockwise size={18} aria-hidden="true" />
        </button>
        <button type="button" className="td-round-btn" onClick={() => void remove()} aria-label="Delete lead" title="Delete lead">
          <Trash size={18} aria-hidden="true" />
        </button>

        <span className="td-lead-actions-gap" />

        {converted ? (
          <button type="button" className="td-pill td-pill--tonal" disabled={busy} onClick={() => void setStatus('pending')}>
            <ArrowClockwise size={16} aria-hidden="true" />
            Move back
          </button>
        ) : (
          <>
            <button type="button" className={`td-pill td-pill--tonal ${panel === 'reminder' ? 'is-active' : ''}`} onClick={() => setPanel(panel === 'reminder' ? '' : 'reminder')}>
              Reminder
            </button>
            <button type="button" className="td-pill td-pill--tonal" disabled={busy} onClick={() => void setStatus('converted')}>
              Converted
            </button>
            <button type="button" className={`td-pill td-pill--primary ${panel === 'call' ? 'is-active' : ''}`} onClick={() => setPanel(panel === 'call' ? '' : 'call')}>
              Log call
            </button>
          </>
        )}
      </div>

      {panel === 'call' ? (
        <LogCallPanel lead={lead} token={token} onAuthError={onAuthError} onDone={done} onCancel={() => setPanel('')} />
      ) : null}
      {panel === 'reminder' ? (
        <ReminderPanel lead={lead} token={token} onAuthError={onAuthError} onDone={done} onCancel={() => setPanel('')} />
      ) : null}
      {panel === 'history' ? (
        <ol className="td-history">
          {(lead.history || []).map((h) => (
            <li key={h.id}>
              <span className="td-meta">{formatDate(h.at)}</span>
              <span>
                {h.type === 'call' ? `Call · ${OUTCOME_LABELS[h.outcome] || h.outcome}` : null}
                {h.type === 'created' ? 'Lead created' : null}
                {h.type === 'status' ? `Moved to ${STATUS_LABELS[h.status] || h.status}` : null}
                {h.type === 'reminder' ? 'Reminder updated' : null}
                {h.type === 'note' ? 'Note' : null}
                {h.type === 'call' && h.status ? ` → ${STATUS_LABELS[h.status]}` : null}
              </span>
              {h.note && h.type !== 'reminder' ? <em>{h.note}</em> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  )
}

function LeadList({ token, onAuthError, stage, refreshKey, onChanged, stats }) {
  const [tab, setTab] = useState(stage === 'converted' ? 'all' : 'due')
  const [q, setQ] = useState('')
  const [batch, setBatch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ leads: [], total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        stage,
        status: tab === 'due' ? 'all' : tab,
        q,
        batch,
        page: String(page),
        pageSize: '30',
      })
      if (tab === 'due') params.set('due', '1')
      const res = await adminFetch(`/api/admin/leads?${params}`, { token })
      setData(res)
      setError('')
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [token, stage, tab, q, batch, page, onAuthError])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const tabCount = (id) => {
    if (!stats) return ''
    if (id === 'due') return stats.dueToday + stats.overdue
    if (id === 'all') return stats.followUps
    return stats.counts[id] ?? ''
  }

  return (
    <>
      {stage !== 'converted' ? (
        <div className="td-tabs" role="tablist">
          {FOLLOWUP_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`td-tab td-tab--${t.id} ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => {
                setPage(1)
                setTab(t.id)
              }}
            >
              {t.label}
              <span className="td-tab-count">{tabCount(t.id)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="td-filters">
        <input
          className="td-input"
          type="search"
          placeholder="Search name, phone, Gmail…"
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
        />
        <select
          className="td-input"
          value={batch}
          onChange={(e) => {
            setPage(1)
            setBatch(e.target.value)
          }}
        >
          <option value="">All batches</option>
          {(stats?.batches || []).map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {error ? <p className="td-error">{error}</p> : null}
      {loading && !data.leads.length ? <p className="td-muted">Loading…</p> : null}
      <div className={data.leads.length ? 'td-group' : ''}>
        {!loading && !data.leads.length ? (
          <p className="td-empty">
            {stage === 'converted'
              ? 'No converted leads yet.'
              : tab === 'due'
                ? 'No reminders due today.'
                : 'No leads here.'}
          </p>
        ) : null}
        {data.leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            token={token}
            onAuthError={onAuthError}
            onChanged={onChanged}
            converted={stage === 'converted'}
          />
        ))}
      </div>
      <Pagination page={data.page || page} totalPages={data.totalPages || 1} onChange={setPage} />
    </>
  )
}

export function SalesSection({ token, onAuthError, stage, onGo }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const bump = useCallback(() => setRefreshKey((k) => k + 1), [])
  const { stats, error } = useLeadStats(token, onAuthError, refreshKey)

  const titles = {
    'sales-add': ['Stage 1 · Add Lead', 'Add a lead and record the first call in one go.'],
    'sales-followup': ['Stage 2 · Follow-ups', 'Every lead that is not converted yet. Call, set reminders, move forward.'],
    'sales-converted': ['Stage 3 · Converted', 'Leads who joined the course.'],
  }
  const [title, subtitle] = titles[stage]

  const cards =
    stage === 'sales-converted'
      ? [
          { label: 'Total converted', value: stats?.counts.converted ?? '—' },
          { label: 'Converted this month', value: stats?.convertedThisMonth ?? '—' },
          { label: 'Conversion rate', value: stats ? `${stats.conversionRate}%` : '—', hint: 'Converted ÷ all leads' },
        ]
      : [
          { label: 'Due today', value: stats?.dueToday ?? '—' },
          { label: 'Overdue', value: stats?.overdue ?? '—' },
          { label: 'Not called', value: stats?.counts.not_called ?? '—' },
          { label: 'Open follow-ups', value: stats?.followUps ?? '—' },
          { label: 'Converted', value: stats?.counts.converted ?? '—' },
        ]

  return (
    <div className="td-section">
      <div className="td-section-head">
        <div>
          <h2>{title}</h2>
          <p className="td-muted">{subtitle}</p>
        </div>
        <button type="button" className="td-btn td-btn--ghost" onClick={bump}>Refresh</button>
      </div>

      <StageStepper current={stage} stats={stats} onGo={onGo} />
      {error ? <p className="td-error">{error}</p> : null}
      <StatCards items={cards} />

      {stage === 'sales-add' ? (
        <AddLeadStage token={token} onAuthError={onAuthError} stats={stats} onSaved={bump} />
      ) : (
        <LeadList
          key={stage}
          token={token}
          onAuthError={onAuthError}
          stage={stage === 'sales-converted' ? 'converted' : 'followup'}
          refreshKey={refreshKey}
          onChanged={bump}
          stats={stats}
        />
      )}
    </div>
  )
}
