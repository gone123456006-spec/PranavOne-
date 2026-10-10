/**
 * Sales pipeline (TredsDash → Sales).
 *
 * Stage 1  Add lead + first call outcome
 * Stage 2  Follow-ups: every lead that is not converted
 * Stage 3  Converted leads only
 */
import { randomUUID } from 'node:crypto'
import { col, isMongoEnabled } from './mongo.js'

export const LEAD_STATUSES = [
  'not_called',
  'pending',
  'recall_later',
  'not_picked',
  'converted',
  'not_interested',
]

export const CALL_OUTCOMES = ['connected', 'busy', 'not_picked', 'call_later']

/** Sources an admin can pick. "website" is set automatically; legacy "manual" leads count as "other". */
export const LEAD_SOURCES = ['whatsapp', 'call', 'offline', 'other']
const SOURCE_LABELS = { whatsapp: 'WhatsApp', call: 'Call', offline: 'Offline', other: 'Other', website: 'Website' }
const MAX_CALLS = 999

/** Required when a lead is marked "not_interested". */
export const LOST_REASONS = [
  'fee_high',
  'joined_elsewhere',
  'no_time',
  'location_far',
  'not_needed',
  'not_reachable',
  'family_decision',
  'other',
]
const LOST_REASON_LABELS = {
  fee_high: 'Fee too high',
  joined_elsewhere: 'Joined another institute',
  no_time: 'No time right now',
  location_far: 'Location too far',
  not_needed: 'Not interested in course',
  not_reachable: 'Never reachable',
  family_decision: 'Family said no',
  other: 'Other',
}

export const PAYMENT_MODES = ['upi', 'cash', 'bank', 'card', 'other']
const PAYMENT_MODE_LABELS = { upi: 'UPI', cash: 'Cash', bank: 'Bank transfer', card: 'Card', other: 'Other' }
const MAX_AMOUNT = 1_000_000

const CONNECTED_STATUSES = ['converted', 'pending', 'recall_later', 'not_interested']
const FOLLOW_UP_STATUSES = LEAD_STATUSES.filter((s) => s !== 'converted')

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function assertDb() {
  if (!isMongoEnabled()) {
    throw httpError(503, 'Database is not connected. Set MONGODB_URI on the server.')
  }
}

function cleanText(value, max = 200) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, max)
}

function cleanNote(value) {
  return String(value ?? '').trim().slice(0, 2000)
}

function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits.length === 10 ? digits : null
}

function normalizeEmail(value) {
  const email = String(value ?? '').trim().toLowerCase()
  if (!email) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, 'Gmail ID looks invalid.')
  }
  return email
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Busy / not picked always parks the lead in "Not picked up"; call-later parks it in "Recall later". */
function resolveStatus(outcome, requested) {
  if (outcome === 'busy' || outcome === 'not_picked') return 'not_picked'
  if (outcome === 'call_later') return 'recall_later'
  if (outcome === 'connected') {
    return CONNECTED_STATUSES.includes(requested) ? requested : 'pending'
  }
  return LEAD_STATUSES.includes(requested) ? requested : 'not_called'
}

function parseAmount(value, label) {
  const amount = Math.round(Number(value) * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    throw httpError(400, `${label} must be between ₹1 and ₹10,00,000.`)
  }
  return amount
}

function parseFee(value) {
  if (value === null || value === '' || value === undefined) return null
  return parseAmount(value, 'Course fee')
}

function parseSource(value) {
  if (LEAD_SOURCES.includes(value)) return value
  throw httpError(400, 'Choose a source: WhatsApp, Call, Offline or Other.')
}

function parseCallCount(value) {
  const count = Number(value)
  if (!Number.isInteger(count) || count < 0 || count > MAX_CALLS) {
    throw httpError(400, `Times called must be a whole number from 0 to ${MAX_CALLS}.`)
  }
  return count
}

/** Returns the $set fields for the lost reason, or throws if a not-interested lead has none. */
function lostReasonFields(status, input) {
  if (status !== 'not_interested') return { lostReason: null, lostNote: null }
  if (!LOST_REASONS.includes(input.lostReason)) {
    throw httpError(400, 'Choose why the lead did not convert.')
  }
  const lostNote = cleanNote(input.lostNote).slice(0, 300) || null
  if (input.lostReason === 'other' && !lostNote) {
    throw httpError(400, 'Write the reason when you choose Other.')
  }
  return { lostReason: input.lostReason, lostNote }
}

function lostReasonText({ lostReason, lostNote }) {
  if (!lostReason) return ''
  const label = LOST_REASON_LABELS[lostReason]
  return lostNote ? `${label}: ${lostNote}` : label
}

function formatRupees(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

function paymentSummary(doc) {
  const feeTotal = doc.feeTotal ?? null
  const paidTotal = Math.round((doc.paidTotal || 0) * 100) / 100
  const dueAmount = feeTotal ? Math.max(0, Math.round((feeTotal - paidTotal) * 100) / 100) : null
  let paymentStatus = 'unpaid'
  if (paidTotal > 0) paymentStatus = feeTotal && paidTotal >= feeTotal ? 'paid' : 'partial'
  return { feeTotal, paidTotal, dueAmount, paymentStatus }
}

function mapLead(doc) {
  if (!doc) return null
  return {
    ...paymentSummary(doc),
    payments: (doc.payments || [])
      .slice()
      .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)),
    id: doc._id,
    name: doc.name,
    phone: doc.phone,
    email: doc.email || null,
    batch: doc.batch || null,
    location: doc.location || null,
    source: doc.source === 'manual' || !doc.source ? 'other' : doc.source,
    status: doc.status,
    reminderAt: doc.reminderAt || null,
    attempts: doc.attempts || 0,
    lostReason: doc.status === 'not_interested' ? doc.lostReason || null : null,
    lostNote: doc.status === 'not_interested' ? doc.lostNote || null : null,
    lastOutcome: doc.lastOutcome || null,
    lastNote: doc.lastNote || null,
    lastCalledAt: doc.lastCalledAt || null,
    convertedAt: doc.convertedAt || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    history: (doc.history || []).slice().reverse(),
  }
}

function historyEntry({ type, outcome = null, status = null, note = '' }) {
  return {
    id: randomUUID(),
    type,
    outcome,
    status,
    note: note || null,
    at: new Date(),
  }
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export async function listLeads({
  stage = 'followup',
  status = 'all',
  q = '',
  due = false,
  batch = '',
  payment = '',
  source = '',
  page = 1,
  pageSize = 30,
} = {}) {
  assertDb()
  const size = Math.min(100, Math.max(1, Number(pageSize) || 30))
  const current = Math.max(1, Number(page) || 1)

  const filter = {}
  if (stage === 'converted') {
    filter.status = 'converted'
  } else if (status !== 'all' && FOLLOW_UP_STATUSES.includes(status)) {
    filter.status = status
  } else {
    filter.status = { $in: FOLLOW_UP_STATUSES.filter((s) => s !== 'not_interested') }
  }

  if (due && stage !== 'converted') {
    filter.reminderAt = { $ne: null, $lte: endOfToday() }
  }

  const search = cleanText(q, 80)
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { batch: rx }]
  }

  const batchName = cleanText(batch, 80)
  if (batchName) filter.batch = batchName

  if (source === 'other') filter.source = { $in: ['other', 'manual', null] }
  else if (source === 'website' || LEAD_SOURCES.includes(source)) filter.source = source

  const paid = { $ifNull: ['$paidTotal', 0] }
  if (payment === 'unpaid') filter.$expr = { $lte: [paid, 0] }
  if (payment === 'paid') {
    filter.$expr = { $and: [{ $gt: ['$feeTotal', 0] }, { $gte: [paid, '$feeTotal'] }] }
  }
  if (payment === 'partial') {
    filter.$expr = {
      $and: [
        { $gt: [paid, 0] },
        { $or: [{ $not: [{ $gt: ['$feeTotal', 0] }] }, { $lt: [paid, '$feeTotal'] }] },
      ],
    }
  }

  const sort =
    stage === 'converted'
      ? { convertedAt: -1 }
      : due
        ? { reminderAt: 1 }
        : { updatedAt: -1 }

  const [rows, total] = await Promise.all([
    col('leads')
      .find(filter)
      .sort(sort)
      .skip((current - 1) * size)
      .limit(size)
      .toArray(),
    col('leads').countDocuments(filter),
  ])

  return {
    leads: rows.map(mapLead),
    total,
    page: current,
    pageSize: size,
    totalPages: Math.max(1, Math.ceil(total / size)),
  }
}

export async function getLeadStats() {
  assertDb()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [byStatus, dueToday, overdue, convertedThisMonth, addedToday, batches, money, monthMoney, lost] =
    await Promise.all([
      col('leads')
        .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        .toArray(),
      col('leads').countDocuments({
        status: { $in: FOLLOW_UP_STATUSES },
        reminderAt: { $gte: new Date(), $lte: endOfToday() },
      }),
      col('leads').countDocuments({
        status: { $in: FOLLOW_UP_STATUSES },
        reminderAt: { $ne: null, $lt: new Date() },
      }),
      col('leads').countDocuments({
        status: 'converted',
        convertedAt: { $gte: monthStart },
      }),
      col('leads').countDocuments({ createdAt: { $gte: startOfToday() } }),
      col('leads')
        .aggregate([
          { $match: { batch: { $nin: [null, ''] } } },
          { $group: { _id: '$batch' } },
        ])
        .toArray(),
      col('leads')
        .aggregate([
          {
            $group: {
              _id: null,
              collected: { $sum: { $ifNull: ['$paidTotal', 0] } },
              totalCalls: { $sum: { $ifNull: ['$attempts', 0] } },
              pendingDues: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ['$status', 'converted'] }, { $gt: ['$feeTotal', 0] }] },
                    { $max: [0, { $subtract: ['$feeTotal', { $ifNull: ['$paidTotal', 0] }] }] },
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray(),
      col('leads')
        .aggregate([
          { $match: { 'payments.paidAt': { $gte: monthStart } } },
          { $unwind: '$payments' },
          { $match: { 'payments.paidAt': { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: '$payments.amount' } } },
        ])
        .toArray(),
      col('leads')
        .aggregate([
          { $match: { status: 'not_interested' } },
          { $group: { _id: { $ifNull: ['$lostReason', 'unknown'] }, count: { $sum: 1 } } },
        ])
        .toArray(),
    ])

  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]))
  for (const row of byStatus) {
    if (row._id in counts) counts[row._id] = row.count
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return {
    total,
    counts,
    followUps: total - counts.converted - counts.not_interested,
    dueToday,
    overdue,
    addedToday,
    convertedThisMonth,
    conversionRate: total ? Math.round((counts.converted / total) * 1000) / 10 : 0,
    batches: batches.map((b) => b._id).sort(),
    collected: money[0]?.collected || 0,
    collectedThisMonth: monthMoney[0]?.total || 0,
    pendingDues: money[0]?.pendingDues || 0,
    totalCalls: money[0]?.totalCalls || 0,
    lostReasons: Object.fromEntries(lost.map((row) => [row._id, row.count])),
  }
}

export async function createLead(input = {}, options = {}) {
  assertDb()
  const name = cleanText(input.name, 120)
  if (name.length < 2) throw httpError(400, 'Enter the lead name.')
  const phone = normalizePhone(input.phone)
  if (!phone) throw httpError(400, 'Enter a valid 10-digit phone number.')
  const email = normalizeEmail(input.email)
  const batch = cleanText(input.batch, 80) || null
  const feeTotal = parseFee(input.feeTotal)
  const note = cleanNote(input.note)
  const outcome = CALL_OUTCOMES.includes(input.outcome) ? input.outcome : null
  const status = resolveStatus(outcome, input.status)
  const reminderAt = status === 'converted' ? null : parseDate(input.reminderAt)
  const lost = lostReasonFields(status, input)
  const source = options.source || (input.source ? parseSource(input.source) : 'other')
  const callCount = input.callCount === undefined || input.callCount === '' ? 0 : parseCallCount(input.callCount)
  const attempts = Math.max(outcome ? 1 : 0, callCount)

  const existing = await col('leads').findOne({ phone })
  if (existing) {
    throw httpError(
      409,
      `This number is already a lead (${existing.name}, ${existing.status.replace('_', ' ')}).`,
    )
  }

  const now = new Date()
  const history = [historyEntry({ type: 'created', note: source === 'website' ? 'Signed up on website' : '' })]
  if (outcome) history.push(historyEntry({ type: 'call', outcome, status, note: [note, lostReasonText(lost)].filter(Boolean).join(' · ') }))
  else if (note) history.push(historyEntry({ type: 'note', note }))

  const doc = {
    _id: randomUUID(),
    name,
    phone,
    email,
    batch,
    location: cleanText(input.location, 120) || null,
    source,
    status,
    reminderAt,
    attempts,
    ...lost,
    lastOutcome: outcome,
    lastNote: note || null,
    lastCalledAt: outcome ? now : null,
    convertedAt: status === 'converted' ? now : null,
    feeTotal,
    paidTotal: 0,
    payments: [],
    history,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await col('leads').insertOne(doc)
  } catch (error) {
    if (error?.code === 11000) throw httpError(409, 'This number is already a lead.')
    throw error
  }
  return mapLead(doc)
}

export async function logLeadCall(id, input = {}) {
  assertDb()
  const outcome = CALL_OUTCOMES.includes(input.outcome) ? input.outcome : null
  if (!outcome) throw httpError(400, 'Choose the call result.')
  const status = resolveStatus(outcome, input.status)
  const note = cleanNote(input.note)
  const reminderAt = status === 'converted' ? null : parseDate(input.reminderAt)
  const lost = lostReasonFields(status, input)
  const now = new Date()

  const set = {
    status,
    ...lost,
    reminderAt,
    lastOutcome: outcome,
    lastCalledAt: now,
    updatedAt: now,
    ...(note ? { lastNote: note } : {}),
    ...(status === 'converted' ? { convertedAt: now } : {}),
  }

  const doc = await col('leads').findOneAndUpdate(
    { _id: String(id) },
    {
      $set: set,
      $inc: { attempts: 1 },
      $push: {
        history: historyEntry({ type: 'call', outcome, status, note: [note, lostReasonText(lost)].filter(Boolean).join(' · ') }),
      },
    },
    { returnDocument: 'after' },
  )
  if (!doc) throw httpError(404, 'Lead not found.')
  return mapLead(doc)
}

export async function updateLead(id, input = {}) {
  assertDb()
  const now = new Date()
  const set = { updatedAt: now }
  const push = []

  if (input.name !== undefined) {
    const name = cleanText(input.name, 120)
    if (name.length < 2) throw httpError(400, 'Enter the lead name.')
    set.name = name
  }
  if (input.phone !== undefined) {
    const phone = normalizePhone(input.phone)
    if (!phone) throw httpError(400, 'Enter a valid 10-digit phone number.')
    set.phone = phone
  }
  if (input.email !== undefined) set.email = normalizeEmail(input.email)
  if (input.batch !== undefined) set.batch = cleanText(input.batch, 80) || null
  if (input.source !== undefined) {
    set.source = parseSource(input.source)
    push.push(historyEntry({ type: 'source', note: `Source set to ${SOURCE_LABELS[set.source]}` }))
  }
  if (input.callCount !== undefined) {
    set.attempts = parseCallCount(input.callCount)
    push.push(historyEntry({ type: 'calls', note: `Times called set to ${set.attempts}` }))
  }
  if (input.feeTotal !== undefined) {
    set.feeTotal = parseFee(input.feeTotal)
    push.push(
      historyEntry({
        type: 'fee',
        note: set.feeTotal ? `Course fee set to ${formatRupees(set.feeTotal)}` : 'Course fee cleared',
      }),
    )
  }
  if (input.reminderAt !== undefined) {
    set.reminderAt = parseDate(input.reminderAt)
    push.push(
      historyEntry({
        type: 'reminder',
        note: set.reminderAt ? `Reminder set for ${set.reminderAt.toISOString()}` : 'Reminder cleared',
      }),
    )
  }
  if (input.status !== undefined) {
    if (!LEAD_STATUSES.includes(input.status)) throw httpError(400, 'Unknown status.')
    set.status = input.status
    Object.assign(set, lostReasonFields(input.status, input))
    if (input.status === 'converted') {
      set.convertedAt = now
      set.reminderAt = null
    }
    push.push(historyEntry({ type: 'status', status: input.status, note: lostReasonText(set) }))
  }
  if (input.note) {
    const note = cleanNote(input.note)
    set.lastNote = note
    push.push(historyEntry({ type: 'note', note }))
  }

  const update = { $set: set }
  if (push.length) update.$push = { history: { $each: push } }

  let doc
  try {
    doc = await col('leads').findOneAndUpdate({ _id: String(id) }, update, {
      returnDocument: 'after',
    })
  } catch (error) {
    if (error?.code === 11000) throw httpError(409, 'Another lead already has this number.')
    throw error
  }
  if (!doc) throw httpError(404, 'Lead not found.')
  return mapLead(doc)
}

export async function addLeadPayment(id, input = {}) {
  assertDb()
  const amount = parseAmount(input.amount, 'Amount')
  const mode = PAYMENT_MODES.includes(input.mode) ? input.mode : 'upi'
  const now = new Date()
  const paidAt = parseDate(input.paidAt) || now
  if (paidAt > new Date(now.getTime() + 60_000)) throw httpError(400, 'Payment date cannot be in the future.')
  const reference = cleanText(input.reference, 80) || null
  const note = cleanNote(input.note).slice(0, 300) || null

  const payment = { id: randomUUID(), amount, mode, reference, note, paidAt, createdAt: now }
  const doc = await col('leads').findOneAndUpdate(
    { _id: String(id) },
    {
      $push: {
        payments: payment,
        history: historyEntry({
          type: 'payment',
          note: `${formatRupees(amount)} received via ${PAYMENT_MODE_LABELS[mode]}${reference ? ` (Ref ${reference})` : ''}`,
        }),
      },
      $inc: { paidTotal: amount },
      $set: { updatedAt: now },
    },
    { returnDocument: 'after' },
  )
  if (!doc) throw httpError(404, 'Lead not found.')
  return mapLead(doc)
}

export async function deleteLeadPayment(id, paymentId) {
  assertDb()
  const lead = await col('leads').findOne(
    { _id: String(id), 'payments.id': String(paymentId) },
    { projection: { 'payments.$': 1 } },
  )
  const payment = lead?.payments?.[0]
  if (!payment) throw httpError(404, 'Payment not found.')

  const doc = await col('leads').findOneAndUpdate(
    { _id: String(id), 'payments.id': String(paymentId) },
    {
      $pull: { payments: { id: String(paymentId) } },
      $inc: { paidTotal: -payment.amount },
      $set: { updatedAt: new Date() },
      $push: {
        history: historyEntry({ type: 'payment', note: `Removed payment of ${formatRupees(payment.amount)}` }),
      },
    },
    { returnDocument: 'after' },
  )
  if (!doc) throw httpError(404, 'Payment not found.')
  return mapLead(doc)
}

export async function deleteLead(id) {
  assertDb()
  const { deletedCount } = await col('leads').deleteOne({ _id: String(id) })
  if (!deletedCount) throw httpError(404, 'Lead not found.')
  return { ok: true }
}

/** Website Get Started sign-ups become "Not called" leads. Existing numbers are left untouched. */
export async function addWebsiteLead(user) {
  if (!isMongoEnabled()) return null
  const phone = normalizePhone(user?.phone)
  if (!phone) return null
  const now = new Date()
  await col('leads').updateOne(
    { phone },
    {
      $setOnInsert: {
        _id: randomUUID(),
        name: cleanText(user.name, 120) || 'Website visitor',
        phone,
        email: user.email || null,
        batch: null,
        location: cleanText(user.location, 120) || null,
        source: 'website',
        status: 'not_called',
        reminderAt: null,
        attempts: 0,
        lastOutcome: null,
        lastNote: null,
        lastCalledAt: null,
        convertedAt: null,
        feeTotal: null,
        paidTotal: 0,
        payments: [],
        history: [historyEntry({ type: 'created', note: 'Signed up on website' })],
        createdAt: user.createdAt ? new Date(user.createdAt) : now,
        updatedAt: now,
      },
    },
    { upsert: true },
  )
  return phone
}

export async function syncWebsiteLeads() {
  assertDb()
  const users = await col('users')
    .find({ phone: { $nin: [null, ''] } })
    .project({ name: 1, phone: 1, email: 1, location: 1, createdAt: 1 })
    .toArray()
  const before = await col('leads').countDocuments({})
  for (const user of users) {
    await addWebsiteLead(user)
  }
  const after = await col('leads').countDocuments({})
  return { checked: users.length, added: after - before }
}
