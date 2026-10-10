import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  ClockCounterClockwise,
  CurrencyInr,
  FileArrowDown,
  PencilSimple,
  Phone,
  PhoneCall,
  Trash,
  WhatsappLogo,
} from '@phosphor-icons/react'
import { adminFetch, formatDate } from './adminApi.js'
import { Pagination, SheetLetters, StatCards, downloadCsv } from './ui.jsx'

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

const SOURCE_OPTIONS = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'call', label: 'Call' },
  { id: 'offline', label: 'Offline' },
  { id: 'other', label: 'Other' },
]

const SOURCE_LABELS = { website: 'Website', ...Object.fromEntries(SOURCE_OPTIONS.map((s) => [s.id, s.label])) }

const LOST_REASON_OPTIONS = [
  { id: 'fee_high', label: 'Fee too high' },
  { id: 'joined_elsewhere', label: 'Joined another institute' },
  { id: 'no_time', label: 'No time right now' },
  { id: 'location_far', label: 'Location too far' },
  { id: 'not_needed', label: 'Not interested in course' },
  { id: 'not_reachable', label: 'Never reachable' },
  { id: 'family_decision', label: 'Family said no' },
  { id: 'other', label: 'Other' },
]

const LOST_REASON_LABELS = { unknown: 'No reason given', ...Object.fromEntries(LOST_REASON_OPTIONS.map((r) => [r.id, r.label])) }

function lostReasonText(lead) {
  if (!lead.lostReason) return ''
  const label = LOST_REASON_LABELS[lead.lostReason] || lead.lostReason
  return lead.lostNote ? `${label}: ${lead.lostNote}` : label
}

const PAYMENT_MODE_OPTIONS = [
  { id: 'upi', label: 'UPI' },
  { id: 'cash', label: 'Cash' },
  { id: 'bank', label: 'Bank transfer' },
  { id: 'card', label: 'Card' },
  { id: 'other', label: 'Other' },
]

const PAYMENT_MODE_LABELS = Object.fromEntries(PAYMENT_MODE_OPTIONS.map((m) => [m.id, m.label]))

const PAYMENT_STATUS_LABELS = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' }

function rupees(amount) {
  if (amount === null || amount === undefined) return ''
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

function todayInput() {
  return toLocalInput(new Date()).slice(0, 10)
}

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

function LostReasonFields({ reason, note, onReason, onNote }) {
  return (
    <div className="td-lost">
      <p className="td-label">Reason for not converting *</p>
      <Chips name="Reason for not converting" value={reason} onChange={onReason} options={LOST_REASON_OPTIONS} />
      <input
        className="td-input"
        value={note}
        onChange={(e) => onNote(e.target.value)}
        maxLength={300}
        required={reason === 'other'}
        placeholder={reason === 'other' ? 'Write the reason *' : 'More detail (optional) — e.g. budget ₹3000 only'}
        aria-label="Reason detail"
      />
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
    source: 'call',
    callCount: '',
    note: '',
    outcome: '',
    status: 'pending',
    reminder: '',
    feeTotal: '',
    paidNow: '',
    paidMode: 'upi',
    lostReason: '',
    lostNote: '',
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
  const isConverted = form.outcome === 'connected' && form.status === 'converted'
  const isLost = form.outcome === 'connected' && form.status === 'not_interested'

  async function onSubmit(event) {
    event.preventDefault()
    if (isLost && !form.lostReason) {
      setError('Choose why the lead did not convert.')
      return
    }
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
          source: form.source,
          callCount: form.callCount === '' ? undefined : Number(form.callCount),
          note: form.note,
          outcome: form.outcome || undefined,
          status: form.outcome === 'connected' ? form.status : undefined,
          reminderAt: showReminder ? toIso(form.reminder) : null,
          feeTotal: form.feeTotal ? Number(form.feeTotal) : null,
          ...(isLost ? { lostReason: form.lostReason, lostNote: form.lostNote } : {}),
        },
      })
      let paymentNote = ''
      if (isConverted && Number(form.paidNow) > 0) {
        try {
          await adminFetch(`/api/admin/leads/${res.lead.id}/payments`, {
            token,
            method: 'POST',
            body: { amount: Number(form.paidNow), mode: form.paidMode },
          })
          paymentNote = ` · ${rupees(form.paidNow)} payment recorded`
        } catch (err) {
          paymentNote = ` · payment not saved: ${err.message}`
        }
      }
      setMessage(
        `${res.lead.name} saved → ${destinationLabel(form.outcome, form.status)}${paymentNote}`,
      )
      setForm({ ...empty, batch: form.batch, source: form.source })
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

        <div className="td-form-row">
          <div>
            <p className="td-label">Source</p>
            <Chips name="Source" value={form.source} onChange={set('source')} options={SOURCE_OPTIONS} />
          </div>
          <div>
            <label className="td-label" htmlFor="lead-calls">How many times you called <span className="td-optional">(optional)</span></label>
            <input id="lead-calls" className="td-input" type="number" min="0" max="999" step="1" inputMode="numeric" value={form.callCount} onChange={(e) => set('callCount')(e.target.value)} placeholder={form.outcome ? 'e.g. 1' : 'e.g. 0'} />
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
        {isLost ? (
          <LostReasonFields reason={form.lostReason} note={form.lostNote} onReason={set('lostReason')} onNote={set('lostNote')} />
        ) : null}

        <div className="td-form-row">
          <div>
            <label className="td-label" htmlFor="lead-fee">Course fee (₹) <span className="td-optional">(optional)</span></label>
            <input id="lead-fee" className="td-input" type="number" min="1" step="1" inputMode="numeric" value={form.feeTotal} onChange={(e) => set('feeTotal')(e.target.value)} placeholder="e.g. 5000" />
          </div>
          {isConverted ? (
            <div>
              <label className="td-label" htmlFor="lead-paid">Paid now (₹) <span className="td-optional">(optional)</span></label>
              <input id="lead-paid" className="td-input" type="number" min="1" step="1" inputMode="numeric" value={form.paidNow} onChange={(e) => set('paidNow')(e.target.value)} placeholder="Amount received today" />
            </div>
          ) : null}
        </div>
        {isConverted && Number(form.paidNow) > 0 ? (
          <>
            <p className="td-label">Payment mode</p>
            <Chips name="Payment mode" value={form.paidMode} onChange={set('paidMode')} options={PAYMENT_MODE_OPTIONS} />
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
  const [lostReason, setLostReason] = useState('')
  const [lostNote, setLostNote] = useState('')
  const [reminder, setReminder] = useState(lead.reminderAt ? toLocalInput(lead.reminderAt) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const reminderNeeded = needsReminder(outcome, status)
  const showReminder = reminderNeeded || outcome !== 'connected' || status === 'pending'
  const isLost = outcome === 'connected' && status === 'not_interested'

  async function onSubmit(event) {
    event.preventDefault()
    if (isLost && !lostReason) {
      setError('Choose why the lead did not convert.')
      return
    }
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
          ...(isLost ? { lostReason, lostNote } : {}),
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
      {isLost ? <LostReasonFields reason={lostReason} note={lostNote} onReason={setLostReason} onNote={setLostNote} /> : null}
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

function LostReasonPanel({ lead, token, onAuthError, onDone, onCancel }) {
  const [reason, setReason] = useState(lead.lostReason || '')
  const [note, setNote] = useState(lead.lostNote || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event) {
    event.preventDefault()
    if (!reason) {
      setError('Choose why the lead did not convert.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await adminFetch(`/api/admin/leads/${lead.id}`, {
        token,
        method: 'PATCH',
        body: { status: 'not_interested', lostReason: reason, lostNote: note },
      })
      onDone?.(res.lead)
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Could not save')
      setSaving(false)
    }
  }

  return (
    <form className="td-lead-panel" onSubmit={onSubmit}>
      <LostReasonFields reason={reason} note={note} onReason={setReason} onNote={setNote} />
      {error ? <p className="td-error">{error}</p> : null}
      <div className="td-inline-actions">
        <button type="button" className="td-btn td-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="td-btn td-btn--primary td-btn--flat" disabled={saving}>
          {saving ? 'Saving…' : 'Mark not interested'}
        </button>
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

const ALL_STATUS_OPTIONS = Object.entries(STATUS_LABELS)

function shortDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const LEAD_CSV_COLUMNS = [
  { label: 'Name', value: (l) => l.name },
  { label: 'Phone', value: (l) => l.phone },
  { label: 'Email', value: (l) => l.email },
  { label: 'Batch', value: (l) => l.batch },
  { label: 'Status', value: (l) => STATUS_LABELS[l.status] || l.status },
  { label: 'Times called', value: (l) => l.attempts },
  { label: 'Course fee', value: (l) => l.feeTotal ?? '' },
  { label: 'Paid', value: (l) => l.paidTotal },
  { label: 'Due', value: (l) => l.dueAmount ?? '' },
  { label: 'Payment status', value: (l) => PAYMENT_STATUS_LABELS[l.paymentStatus] },
  { label: 'Last call result', value: (l) => OUTCOME_LABELS[l.lastOutcome] || '' },
  { label: 'Last called', value: (l) => shortDate(l.lastCalledAt) },
  { label: 'Reminder', value: (l) => shortDate(l.reminderAt) },
  { label: 'Converted on', value: (l) => shortDate(l.convertedAt) },
  { label: 'Last note', value: (l) => l.lastNote },
  { label: 'Reason not converted', value: (l) => lostReasonText(l) },
  { label: 'Source', value: (l) => SOURCE_LABELS[l.source] || l.source },
  { label: 'Added', value: (l) => shortDate(l.createdAt) },
]

function PaymentPanel({ lead, token, onAuthError, onChanged, onCancel, canDelete }) {
  const [fee, setFee] = useState(lead.feeTotal ? String(lead.feeTotal) : '')
  const [amount, setAmount] = useState(lead.dueAmount ? String(lead.dueAmount) : '')
  const [mode, setMode] = useState('upi')
  const [paidOn, setPaidOn] = useState(todayInput())
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function call(path, options) {
    setSaving(true)
    setError('')
    try {
      await adminFetch(path, { token, ...options })
      onChanged?.()
      return true
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Could not save')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveFee() {
    await call(`/api/admin/leads/${lead.id}`, { method: 'PATCH', body: { feeTotal: fee ? Number(fee) : null } })
  }

  async function addPayment(event) {
    event.preventDefault()
    const paidAt = paidOn === todayInput() ? new Date().toISOString() : new Date(`${paidOn}T12:00`).toISOString()
    const saved = await call(`/api/admin/leads/${lead.id}/payments`, {
      method: 'POST',
      body: { amount: Number(amount), mode, reference, note, paidAt },
    })
    if (saved) {
      setAmount('')
      setReference('')
      setNote('')
    }
  }

  async function removePayment(payment) {
    if (!window.confirm(`Remove payment of ${rupees(payment.amount)}?`)) return
    await call(`/api/admin/leads/${lead.id}/payments/${payment.id}`, { method: 'DELETE' })
  }

  return (
    <div className="td-lead-panel td-pay">
      <div className="td-pay-summary">
        <div><span>Course fee</span><strong>{lead.feeTotal ? rupees(lead.feeTotal) : 'Not set'}</strong></div>
        <div><span>Paid</span><strong className="td-pay-paid">{rupees(lead.paidTotal)}</strong></div>
        <div><span>Due</span><strong className={lead.dueAmount ? 'td-pay-due' : ''}>{lead.dueAmount === null ? '—' : rupees(lead.dueAmount)}</strong></div>
        <div><span>Status</span><strong className={`td-pay-status td-pay-status--${lead.paymentStatus}`}>{PAYMENT_STATUS_LABELS[lead.paymentStatus]}</strong></div>
      </div>

      <div className="td-pay-fee">
        <label className="td-label" htmlFor={`fee-${lead.id}`}>Total course fee (₹)</label>
        <div className="td-pay-inline">
          <input id={`fee-${lead.id}`} className="td-input" type="number" min="1" step="1" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="e.g. 5000" />
          <button type="button" className="td-btn td-btn--ghost" disabled={saving || fee === (lead.feeTotal ? String(lead.feeTotal) : '')} onClick={() => void saveFee()}>
            Save fee
          </button>
        </div>
      </div>

      <form onSubmit={addPayment}>
        <p className="td-label">Record a payment</p>
        <div className="td-pay-grid">
          <input className="td-input" type="number" min="1" step="1" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (₹)" aria-label="Amount" />
          <input className="td-input" type="date" required max={todayInput()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} aria-label="Payment date" />
          <input className="td-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / Transaction ID" aria-label="Reference" />
          <input className="td-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" />
        </div>
        <Chips name="Payment mode" value={mode} onChange={setMode} options={PAYMENT_MODE_OPTIONS} />
        {error ? <p className="td-error">{error}</p> : null}
        <div className="td-inline-actions">
          <button type="button" className="td-btn td-btn--ghost" onClick={onCancel}>Close</button>
          <button type="submit" className="td-btn td-btn--primary td-btn--flat" disabled={saving || !amount}>
            {saving ? 'Saving…' : 'Add payment'}
          </button>
        </div>
      </form>

      {lead.payments?.length ? (
        <table className="td-pay-table">
          <thead>
            <tr><th>Date</th><th className="td-sheet-num">Amount</th><th>Mode</th><th>Reference</th><th>Note</th><th aria-label="Remove" /></tr>
          </thead>
          <tbody>
            {lead.payments.map((p) => (
              <tr key={p.id}>
                <td>{shortDate(p.paidAt)}</td>
                <td className="td-sheet-num"><strong>{rupees(p.amount)}</strong></td>
                <td>{PAYMENT_MODE_LABELS[p.mode] || p.mode}</td>
                <td>{p.reference || ''}</td>
                <td>{p.note || ''}</td>
                <td>
                  {canDelete ? (
                    <button type="button" className="td-sheet-icon td-sheet-icon--danger" onClick={() => void removePayment(p)} title="Remove payment" aria-label="Remove payment">
                      <Trash size={15} aria-hidden="true" />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="td-muted">No payments recorded yet.</p>
      )}
    </div>
  )
}

function LeadHistory({ lead }) {
  if (!lead.history?.length) return <p className="td-muted">No history yet.</p>
  return (
    <ol className="td-history">
      {lead.history.map((h) => (
        <li key={h.id}>
          <span className="td-meta">{formatDate(h.at)}</span>
          <span>
            {h.type === 'call' ? `Call · ${OUTCOME_LABELS[h.outcome] || h.outcome}` : null}
            {h.type === 'created' ? 'Lead created' : null}
            {h.type === 'status' ? `Moved to ${STATUS_LABELS[h.status] || h.status}` : null}
            {h.type === 'reminder' ? 'Reminder updated' : null}
            {h.type === 'note' ? 'Note' : null}
            {h.type === 'payment' ? 'Payment' : null}
            {h.type === 'fee' ? 'Course fee' : null}
            {h.type === 'source' ? 'Source' : null}
            {h.type === 'calls' ? 'Call count' : null}
            {h.type === 'call' && h.status ? ` → ${STATUS_LABELS[h.status]}` : null}
          </span>
          {h.note && h.type !== 'reminder' ? <em>{h.note}</em> : null}
        </li>
      ))}
    </ol>
  )
}

function EditLeadPanel({ lead, batches, token, onAuthError, onDone, onCancel }) {
  const initial = {
    name: lead.name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    batch: lead.batch || '',
    source: lead.source || 'other',
    callCount: String(lead.attempts ?? 0),
    feeTotal: lead.feeTotal ? String(lead.feeTotal) : '',
  }
  const [form, setForm] = useState(initial)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const body = {}
  for (const key of Object.keys(initial)) {
    if (form[key].trim() !== initial[key]) body[key] = form[key].trim()
  }
  if (body.callCount !== undefined) body.callCount = Number(body.callCount)
  if (body.feeTotal !== undefined) body.feeTotal = body.feeTotal ? Number(body.feeTotal) : null
  if (note.trim()) body.note = note.trim()
  const changed = Object.keys(body).length > 0

  async function onSubmit(event) {
    event.preventDefault()
    if (!changed) return
    setSaving(true)
    setError('')
    try {
      const res = await adminFetch(`/api/admin/leads/${lead.id}`, { token, method: 'PATCH', body })
      onDone?.(res.lead)
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Could not save')
      setSaving(false)
    }
  }

  return (
    <form className="td-lead-panel td-edit" onSubmit={onSubmit}>
      <div className="td-edit-grid">
        <label>
          <span>Name *</span>
          <input className="td-input" value={form.name} onChange={set('name')} required minLength={2} />
        </label>
        <label>
          <span>Phone *</span>
          <input className="td-input" type="tel" inputMode="numeric" value={form.phone} onChange={set('phone')} required />
        </label>
        <label>
          <span>Gmail ID</span>
          <input className="td-input" type="email" value={form.email} onChange={set('email')} placeholder="name@gmail.com" />
        </label>
        <label>
          <span>Batch</span>
          <input className="td-input" list={`batches-${lead.id}`} value={form.batch} onChange={set('batch')} placeholder="e.g. 19 October 2026" />
          <datalist id={`batches-${lead.id}`}>
            {batches.map((b) => <option key={b} value={b} />)}
          </datalist>
        </label>
        <label>
          <span>Source</span>
          <select className="td-input" value={form.source} onChange={set('source')} disabled={lead.source === 'website'}>
            {lead.source === 'website' ? <option value="website">Website</option> : null}
            {SOURCE_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label>
          <span>Times called</span>
          <input className="td-input" type="number" min="0" max="999" step="1" value={form.callCount} onChange={set('callCount')} required />
        </label>
        <label>
          <span>Course fee (₹)</span>
          <input className="td-input" type="number" min="1" step="1" value={form.feeTotal} onChange={set('feeTotal')} placeholder="Not set" />
        </label>
      </div>
      <label className="td-edit-note">
        <span>Add a note</span>
        <textarea className="td-input td-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything new about this lead? It is saved in History." />
      </label>
      {error ? <p className="td-error">{error}</p> : null}
      <div className="td-inline-actions">
        <button type="button" className="td-btn td-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="td-btn td-btn--primary td-btn--flat" disabled={saving || !changed}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

/** Clicks on controls inside a row keep their own behaviour; anywhere else opens the edit form. */
function isRowControl(target) {
  return Boolean(target.closest('button, a, select, input, textarea, label'))
}

function LeadRow({ lead, rowNumber, columns, batches, token, onAuthError, onChanged, converted, canDelete }) {
  const [panel, setPanel] = useState('')
  const [busy, setBusy] = useState(false)
  const overdue = !converted && lead.reminderAt && new Date(lead.reminderAt) < new Date()

  async function patchLead(body) {
    setBusy(true)
    try {
      await adminFetch(`/api/admin/leads/${lead.id}`, { token, method: 'PATCH', body })
      onChanged?.()
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else window.alert(err.message || 'Could not save')
    } finally {
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

  const toggle = (name) => setPanel((current) => (current === name ? '' : name))
  const done = () => {
    setPanel('')
    onChanged?.()
  }

  return (
    <>
      <tr
        className={`td-sheet-row-edit ${panel ? 'is-selected' : ''}`}
        onClick={(e) => {
          if (!isRowControl(e.target)) toggle('edit')
        }}
      >
        <td className="td-sheet-rownum">{rowNumber}</td>
        <td className="td-sheet-sticky">
          <button type="button" className="td-sheet-link" onClick={() => toggle('edit')}>
            {lead.name}
          </button>
        </td>
        <td className="td-sheet-mono">
          <a href={`tel:+91${lead.phone}`}>{lead.phone}</a>
        </td>
        <td>{lead.email || ''}</td>
        <td>{lead.batch || ''}</td>
        <td className="td-sheet-cell-input">
          <select
            className={`td-sheet-select td-status--${lead.status}`}
            value={lead.status}
            disabled={busy}
            aria-label={`Status for ${lead.name}`}
            onChange={(e) => {
              if (e.target.value === 'not_interested') setPanel('lost')
              else void patchLead({ status: e.target.value })
            }}
          >
            {ALL_STATUS_OPTIONS.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </td>
        {!converted ? (
          <td className="td-sheet-note" title={lostReasonText(lead)}>
            {lead.lostReason ? (
              <button type="button" className="td-sheet-link td-sheet-lost" onClick={() => toggle('lost')}>
                {lostReasonText(lead)}
              </button>
            ) : ''}
          </td>
        ) : null}
        <td className="td-sheet-calls">
          <div className="td-sheet-counter">
            <button type="button" disabled={busy || !lead.attempts} onClick={() => void patchLead({ callCount: lead.attempts - 1 })} aria-label={`One less call for ${lead.name}`} title="One less">−</button>
            <strong title={`Called ${lead.attempts} time${lead.attempts === 1 ? '' : 's'}`}>{lead.attempts}</strong>
            <button type="button" disabled={busy} onClick={() => void patchLead({ callCount: lead.attempts + 1 })} aria-label={`One more call for ${lead.name}`} title="One more">+</button>
          </div>
        </td>
        <td className="td-sheet-cell-pay">
          <button type="button" className="td-sheet-pay" onClick={() => toggle('payment')} title="Payments">
            <span className={`td-pay-status td-pay-status--${lead.paymentStatus}`}>
              {PAYMENT_STATUS_LABELS[lead.paymentStatus]}
            </span>
            <span className="td-sheet-sub">
              {lead.feeTotal ? `${rupees(lead.paidTotal)} / ${rupees(lead.feeTotal)}` : lead.paidTotal ? rupees(lead.paidTotal) : 'Fee not set'}
            </span>
          </button>
        </td>
        <td>
          {lead.lastOutcome ? (
            <>
              {OUTCOME_LABELS[lead.lastOutcome]}
              <span className="td-sheet-sub">{shortDate(lead.lastCalledAt)}</span>
            </>
          ) : ''}
        </td>
        <td className={overdue ? 'td-sheet-overdue' : ''}>
          {converted ? shortDate(lead.convertedAt) : shortDate(lead.reminderAt)}
          {overdue ? <span className="td-sheet-sub">Overdue</span> : null}
        </td>
        <td className="td-sheet-note" title={lead.lastNote || ''}>{lead.lastNote || ''}</td>
        <td className="td-sheet-cell-input">
          <select
            className="td-sheet-select td-sheet-select--plain"
            value={lead.source}
            disabled={busy}
            aria-label={`Source for ${lead.name}`}
            onChange={(e) => void patchLead({ source: e.target.value })}
          >
            {lead.source === 'website' ? <option value="website">Website</option> : null}
            {SOURCE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </td>
        <td>{shortDate(lead.createdAt)}</td>
        <td className="td-sheet-actions">
          {!converted ? (
            <button type="button" className={`td-sheet-btn td-sheet-btn--primary ${panel === 'call' ? 'is-active' : ''}`} onClick={() => toggle('call')}>
              Log call
            </button>
          ) : null}
          {!converted ? (
            <button type="button" className={`td-sheet-icon ${panel === 'reminder' ? 'is-active' : ''}`} onClick={() => toggle('reminder')} title="Set reminder" aria-label="Set reminder">
              <Bell size={16} aria-hidden="true" />
            </button>
          ) : null}
          <button type="button" className={`td-sheet-icon ${panel === 'edit' ? 'is-active' : ''}`} onClick={() => toggle('edit')} title="Edit details" aria-label="Edit details">
            <PencilSimple size={16} aria-hidden="true" />
          </button>
          <button type="button" className={`td-sheet-icon ${panel === 'payment' ? 'is-active' : ''}`} onClick={() => toggle('payment')} title="Payments" aria-label="Payments">
            <CurrencyInr size={16} aria-hidden="true" />
          </button>
          <a className="td-sheet-icon td-sheet-icon--wa" href={`https://wa.me/91${lead.phone}`} target="_blank" rel="noreferrer" title="WhatsApp" aria-label={`WhatsApp ${lead.name}`}>
            <WhatsappLogo size={16} weight="fill" aria-hidden="true" />
          </a>
          <button type="button" className={`td-sheet-icon ${panel === 'history' ? 'is-active' : ''}`} onClick={() => toggle('history')} title="History" aria-label="History">
            <ClockCounterClockwise size={16} aria-hidden="true" />
          </button>
          {canDelete ? (
            <button type="button" className="td-sheet-icon td-sheet-icon--danger" onClick={() => void remove()} title="Delete" aria-label="Delete lead">
              <Trash size={16} aria-hidden="true" />
            </button>
          ) : null}
        </td>
      </tr>
      {panel ? (
        <tr className="td-sheet-panel-row">
          <td colSpan={columns}>
            <div className="td-sheet-panel">
              <p className="td-sheet-panel-title">
                {lead.name} · {lead.phone}
                {lead.email ? ` · ${lead.email}` : ''}
              </p>
              <div className="td-panel-tabs" role="tablist" aria-label={`Actions for ${lead.name}`}>
                {[
                  { id: 'edit', label: 'Edit', icon: PencilSimple },
                  ...(!converted ? [{ id: 'call', label: 'Log call', icon: PhoneCall }] : []),
                  ...(!converted ? [{ id: 'reminder', label: 'Reminder', icon: Bell }] : []),
                  { id: 'payment', label: 'Payment', icon: CurrencyInr },
                  { id: 'history', label: 'History', icon: ClockCounterClockwise },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={panel === id}
                    className={panel === id ? 'is-active' : ''}
                    onClick={() => setPanel(id)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </button>
                ))}
                <a href={`tel:+91${lead.phone}`} className="td-panel-tabs-link">
                  <Phone size={16} aria-hidden="true" />
                  Call
                </a>
                <a href={`https://wa.me/91${lead.phone}`} target="_blank" rel="noreferrer" className="td-panel-tabs-link td-panel-tabs-link--wa">
                  <WhatsappLogo size={16} weight="fill" aria-hidden="true" />
                  WhatsApp
                </a>
              </div>
              {panel === 'edit' ? (
                <EditLeadPanel lead={lead} batches={batches} token={token} onAuthError={onAuthError} onDone={done} onCancel={() => setPanel('')} />
              ) : null}
              {panel === 'call' ? (
                <LogCallPanel lead={lead} token={token} onAuthError={onAuthError} onDone={done} onCancel={() => setPanel('')} />
              ) : null}
              {panel === 'reminder' ? (
                <ReminderPanel lead={lead} token={token} onAuthError={onAuthError} onDone={done} onCancel={() => setPanel('')} />
              ) : null}
              {panel === 'payment' ? (
                <PaymentPanel lead={lead} token={token} onAuthError={onAuthError} onChanged={onChanged} onCancel={() => setPanel('')} canDelete={canDelete} />
              ) : null}
              {panel === 'lost' ? (
                <LostReasonPanel lead={lead} token={token} onAuthError={onAuthError} onDone={done} onCancel={() => setPanel('')} />
              ) : null}
              {panel === 'history' ? <LeadHistory lead={lead} /> : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}

function LeadList({ token, onAuthError, stage, refreshKey, onChanged, stats, canDelete }) {
  const [tab, setTab] = useState(stage === 'converted' ? 'all' : 'due')
  const [q, setQ] = useState('')
  const [batch, setBatch] = useState('')
  const [payment, setPayment] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ leads: [], total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const converted = stage === 'converted'
  const pageSize = 50

  const buildParams = useCallback(
    (pageNumber, size) => {
      const params = new URLSearchParams({
        stage,
        status: tab === 'due' ? 'all' : tab,
        q,
        batch,
        payment,
        source,
        page: String(pageNumber),
        pageSize: String(size),
      })
      if (tab === 'due') params.set('due', '1')
      return params
    },
    [stage, tab, q, batch, payment, source],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch(`/api/admin/leads?${buildParams(page, pageSize)}`, { token })
      setData(res)
      setError('')
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [token, buildParams, page, onAuthError])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  async function exportCsv() {
    setExporting(true)
    try {
      const all = []
      for (let p = 1; ; p += 1) {
        const res = await adminFetch(`/api/admin/leads?${buildParams(p, 100)}`, { token })
        all.push(...res.leads)
        if (p >= (res.totalPages || 1)) break
      }
      const day = new Date().toISOString().slice(0, 10)
      downloadCsv(`pranavone-leads-${converted ? 'converted' : tab}-${day}.csv`, LEAD_CSV_COLUMNS, all)
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      else setError(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const tabCount = (id) => {
    if (!stats) return ''
    if (id === 'due') return stats.dueToday + stats.overdue
    if (id === 'all') return stats.followUps
    return stats.counts[id] ?? ''
  }

  const columnCount = converted ? 14 : 15
  const firstRow = ((data.page || page) - 1) * pageSize

  return (
    <>
      {!converted ? (
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

      <div className="td-sheet-toolbar">
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
        <select
          className="td-input"
          value={payment}
          aria-label="Payment status"
          onChange={(e) => {
            setPage(1)
            setPayment(e.target.value)
          }}
        >
          <option value="">All payments</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <select
          className="td-input"
          value={source}
          aria-label="Source"
          onChange={(e) => {
            setPage(1)
            setSource(e.target.value)
          }}
        >
          <option value="">All sources</option>
          {SOURCE_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
          <option value="website">Website</option>
        </select>
        <button type="button" className="td-btn td-btn--ghost" disabled={exporting || !data.total} onClick={() => void exportCsv()}>
          <FileArrowDown size={18} aria-hidden="true" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {error ? <p className="td-error">{error}</p> : null}

      {tab === 'not_interested' && stats?.lostReasons && Object.keys(stats.lostReasons).length ? (
        <div className="td-lost-summary" aria-label="Why leads did not convert">
          <strong>Why leads did not convert:</strong>
          {Object.entries(stats.lostReasons)
            .sort((a, b) => b[1] - a[1])
            .map(([id, count]) => (
              <span key={id}>{LOST_REASON_LABELS[id] || id} <b>{count}</b></span>
            ))}
        </div>
      ) : null}

      <div className="td-sheet-wrap">
        <table className="td-sheet">
          <thead>
            <SheetLetters count={columnCount - 1} />
            <tr>
              <th className="td-sheet-rownum" aria-label="Row" />
              <th className="td-sheet-sticky">Name</th>
              <th>Phone</th>
              <th>Gmail</th>
              <th>Batch</th>
              <th>Status</th>
              {!converted ? <th>Reason not converted</th> : null}
              <th className="td-sheet-num">Times called</th>
              <th>Payment</th>
              <th>Last call</th>
              <th>{converted ? 'Converted on' : 'Reminder'}</th>
              <th>Last note</th>
              <th>Source</th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data.leads.length ? (
              <tr><td className="td-sheet-empty" colSpan={columnCount}>Loading…</td></tr>
            ) : null}
            {!loading && !data.leads.length ? (
              <tr>
                <td className="td-sheet-empty" colSpan={columnCount}>
                  {converted ? 'No converted leads yet.' : tab === 'due' ? 'No reminders due today.' : 'No leads here.'}
                </td>
              </tr>
            ) : null}
            {data.leads.map((lead, i) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                rowNumber={firstRow + i + 1}
                columns={columnCount}
                batches={stats?.batches || []}
                token={token}
                onAuthError={onAuthError}
                onChanged={onChanged}
                converted={converted}
                canDelete={canDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="td-sheet-foot">
        <span>{data.total || 0} leads</span>
        <Pagination page={data.page || page} totalPages={data.totalPages || 1} onChange={setPage} />
      </div>
    </>
  )
}

export function SalesSection({ token, onAuthError, stage, onGo, canDelete = true }) {
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
          { label: 'Fees collected', value: stats ? rupees(stats.collected) : '—', hint: `${stats ? rupees(stats.collectedThisMonth) : '—'} this month` },
          { label: 'Pending dues', value: stats ? rupees(stats.pendingDues) : '—', hint: 'Converted leads with a fee set' },
        ]
      : [
          { label: 'Due today', value: stats?.dueToday ?? '—' },
          { label: 'Overdue', value: stats?.overdue ?? '—' },
          { label: 'Not called', value: stats?.counts.not_called ?? '—' },
          { label: 'Open follow-ups', value: stats?.followUps ?? '—' },
          { label: 'Total calls made', value: stats?.totalCalls ?? '—' },
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
          canDelete={canDelete}
        />
      )}
    </div>
  )
}
