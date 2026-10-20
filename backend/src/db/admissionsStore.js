/**
 * Course admissions (home-page form + Razorpay payments).
 */
import { randomUUID } from 'node:crypto'
import { col, isMongoEnabled } from './mongo.js'

export const COURSE_MODES = ['online', 'offline']
export const ADMISSION_STATUSES = ['created', 'paid', 'failed']

/** Offer price charged via Razorpay. */
export const ADMISSION_FEE_PAISE = 800_000 // ₹8,000
export const ADMISSION_FEE_ORIGINAL_PAISE = 1_200_000 // ₹12,000 (display only)

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function requireMongo() {
  if (!isMongoEnabled()) {
    throw httpError(503, 'MongoDB is not configured (MONGODB_URI).')
  }
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

function normalizePhone(value) {
  const digits = digitsOnly(value)
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

export function formatRupeesFromPaise(paise) {
  const amount = Math.round(Number(paise) || 0) / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function fallbackAdmissionNumber(doc) {
  if (!doc) return ''
  const year = doc.createdAt ? new Date(doc.createdAt).getFullYear() : new Date().getFullYear()
  const raw = String(doc._id || '').replace(/\D/g, '')
  const suffix = raw ? raw.slice(-4) : '1001'
  return `ADM-${year}-${suffix.padStart(4, '0')}`
}

export async function generateAdmissionNumber() {
  const year = new Date().getFullYear()
  try {
    const counter = await col('counters').findOneAndUpdate(
      { _id: `admissions_${year}` },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    )
    const seq = counter?.seq || counter?.value?.seq || 1
    return `ADM-${year}-${String(seq).padStart(4, '0')}`
  } catch (_err) {
    const count = await col('admissions').countDocuments({}).catch(() => 0)
    return `ADM-${year}-${String(count + 1).padStart(4, '0')}`
  }
}

export function mapAdmission(doc) {
  if (!doc) return null
  const admissionNumber = doc.admissionNumber || fallbackAdmissionNumber(doc)
  return {
    id: doc._id,
    admissionNumber,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    courseMode: doc.courseMode,
    courseModeLabel: doc.courseMode === 'offline' ? 'Offline' : 'Online',
    amountPaise: doc.amountPaise,
    amountLabel: formatRupeesFromPaise(doc.amountPaise),
    status: doc.status,
    razorpayOrderId: doc.razorpayOrderId || null,
    razorpayPaymentId: doc.razorpayPaymentId || null,
    paidAt: doc.paidAt ? new Date(doc.paidAt).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  }
}

export function validateAdmissionInput(input = {}) {
  const name = String(input.name || '').trim()
  const email = String(input.email || '').trim().toLowerCase()
  const phone = normalizePhone(input.phone)
  const courseMode = String(input.courseMode || '').trim().toLowerCase()

  if (!name || name.length < 2) {
    throw httpError(400, 'Please enter your full name.')
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, 'Please enter a valid Gmail / email address.')
  }
  if (phone.length !== 10) {
    throw httpError(400, 'Please enter a valid 10-digit mobile number.')
  }
  if (!COURSE_MODES.includes(courseMode)) {
    throw httpError(400, 'Please choose Online or Offline course mode.')
  }

  return { name, email, phone, courseMode }
}

async function syncAdmissionToLead(admission) {
  if (!isMongoEnabled() || !admission) return
  const phone = normalizePhone(admission.phone)
  if (!phone) return
  const now = new Date()
  const amount = Math.round((admission.amountPaise || ADMISSION_FEE_PAISE) / 100)
  const admissionNo = admission.admissionNumber || fallbackAdmissionNumber(admission)
  const modeLabel = admission.courseMode === 'offline' ? 'Offline' : 'Online'
  const paymentEntry = {
    id: randomUUID(),
    amount,
    mode: 'upi',
    reference: admission.razorpayPaymentId || admission.razorpayOrderId || null,
    note: `Online Admission ${admissionNo} (${modeLabel})`,
    paidAt: admission.paidAt ? new Date(admission.paidAt) : now,
    createdAt: now,
  }

  try {
    const existing = await col('leads').findOne({ phone })
    if (existing) {
      const alreadyHasPayment = (existing.payments || []).some(
        (p) => p.reference && p.reference === admission.razorpayPaymentId,
      )
      if (!alreadyHasPayment) {
        await col('leads').updateOne(
          { phone },
          {
            $set: {
              status: 'converted',
              convertedAt: existing.convertedAt || now,
              feeTotal: existing.feeTotal || amount,
              updatedAt: now,
            },
            $push: {
              payments: paymentEntry,
              history: {
                id: randomUUID(),
                type: 'converted',
                note: `Online admission confirmed · No: ${admissionNo} (${modeLabel}) · ₹${amount} via Razorpay (${admission.razorpayPaymentId || ''})`,
                at: now,
              },
            },
            $inc: { paidTotal: amount },
          },
        )
      }
    } else {
      await col('leads').insertOne({
        _id: randomUUID(),
        name: admission.name || 'Admitted Student',
        phone,
        email: admission.email || null,
        batch: null,
        location: null,
        source: 'website',
        status: 'converted',
        attempts: 0,
        lastOutcome: 'connected',
        lastNote: `Admitted online with number ${admissionNo}`,
        lastCalledAt: now,
        reminderAt: null,
        convertedAt: now,
        feeTotal: amount,
        paidTotal: amount,
        payments: [paymentEntry],
        history: [
          {
            id: randomUUID(),
            type: 'converted',
            note: `Online admission confirmed · No: ${admissionNo} (${modeLabel}) · ₹${amount} via Razorpay (${admission.razorpayPaymentId || ''})`,
            at: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      })
    }
  } catch (err) {
    console.error('syncAdmissionToLead error:', err)
  }
}

export async function createAdmissionDraft(input) {
  requireMongo()
  const fields = validateAdmissionInput(input)
  const admissionNumber = await generateAdmissionNumber()
  const now = new Date()
  const doc = {
    _id: randomUUID(),
    admissionNumber,
    ...fields,
    amountPaise: ADMISSION_FEE_PAISE,
    status: 'created',
    razorpayOrderId: null,
    razorpayPaymentId: null,
    razorpaySignature: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await col('admissions').insertOne(doc)
  return mapAdmission(doc)
}

export async function attachRazorpayOrder(admissionId, orderId) {
  requireMongo()
  const doc = await col('admissions').findOneAndUpdate(
    { _id: String(admissionId), status: 'created' },
    {
      $set: {
        razorpayOrderId: String(orderId),
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )
  if (!doc?._id) throw httpError(404, 'Admission not found.')
  return mapAdmission(doc)
}

export async function getAdmissionById(id) {
  requireMongo()
  const doc = await col('admissions').findOne({ _id: String(id) })
  return mapAdmission(doc)
}

export async function getAdmissionByOrderId(orderId) {
  requireMongo()
  const doc = await col('admissions').findOne({ razorpayOrderId: String(orderId) })
  return doc
}

export async function markAdmissionPaid({
  orderId,
  paymentId,
  signature,
}) {
  requireMongo()
  const now = new Date()
  const existing = await col('admissions').findOne({ razorpayOrderId: String(orderId) })
  const admissionNumber =
    existing?.admissionNumber || (await generateAdmissionNumber())

  const doc = await col('admissions').findOneAndUpdate(
    { razorpayOrderId: String(orderId) },
    {
      $set: {
        admissionNumber,
        status: 'paid',
        razorpayPaymentId: String(paymentId),
        razorpaySignature: String(signature),
        paidAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' },
  )
  if (!doc?._id) throw httpError(404, 'Admission order not found.')
  void syncAdmissionToLead(doc).catch(() => undefined)
  return mapAdmission(doc)
}

export async function markAdmissionFailed(orderId) {
  requireMongo()
  const doc = await col('admissions').findOneAndUpdate(
    { razorpayOrderId: String(orderId), status: { $ne: 'paid' } },
    {
      $set: {
        status: 'failed',
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )
  return mapAdmission(doc)
}

export async function listAdmissionsAdmin({
  q = '',
  status = 'all',
  courseMode = '',
  page = 1,
  pageSize = 20,
} = {}) {
  requireMongo()
  const filter = {}
  const query = String(q || '').trim()
  if (query) {
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { admissionNumber: { $regex: safe, $options: 'i' } },
      { name: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
      { phone: { $regex: safe, $options: 'i' } },
      { razorpayPaymentId: { $regex: safe, $options: 'i' } },
      { razorpayOrderId: { $regex: safe, $options: 'i' } },
      { _id: { $regex: safe, $options: 'i' } },
    ]
  }
  if (status && status !== 'all' && ADMISSION_STATUSES.includes(status)) {
    filter.status = status
  }
  if (courseMode && COURSE_MODES.includes(courseMode)) {
    filter.courseMode = courseMode
  }

  const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100)
  const current = Math.max(Number(page) || 1, 1)
  const skip = (current - 1) * size

  const [total, rows, paidCount, paidAmount] = await Promise.all([
    col('admissions').countDocuments(filter),
    col('admissions')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size)
      .toArray(),
    col('admissions').countDocuments({ status: 'paid' }),
    col('admissions')
      .aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amountPaise' } } },
      ])
      .toArray(),
  ])

  return {
    admissions: rows.map(mapAdmission),
    page: current,
    pageSize: size,
    totalPages: Math.max(1, Math.ceil(total / size)),
    total,
    stats: {
      paidCount,
      paidAmountPaise: paidAmount[0]?.total || 0,
      paidAmountLabel: formatRupeesFromPaise(paidAmount[0]?.total || 0),
    },
  }
}
