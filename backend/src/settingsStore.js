/**
 * Runtime app settings (workshop price + admission course fee).
 * Stored in MongoDB; env vars are fallbacks until an admin saves overrides.
 */

import { col, isMongoEnabled } from './db/mongo.js'

const KEYS = {
  workshopAmountPaise: 'workshop_amount_paise',
  admissionFeeRupees: 'admission_fee_rupees',
  admissionOriginalFeeRupees: 'admission_original_fee_rupees',
}

let memoryCache = null
let memoryCacheAt = 0
const CACHE_MS = 2_000

function envDefaults() {
  const paise = Number(process.env.WORKSHOP_AMOUNT_PAISE || 100)
  const admFee = Number(process.env.ADMISSION_FEE_RUPEES || 8000)
  const admOrigFee = Number(process.env.ADMISSION_ORIGINAL_FEE_RUPEES || 12000)
  return {
    workshopAmountPaise: Number.isFinite(paise) && paise > 0 ? Math.round(paise) : 100,
    admissionFeeRupees: Number.isFinite(admFee) && admFee > 0 ? Math.round(admFee) : 8000,
    admissionOriginalFeeRupees:
      Number.isFinite(admOrigFee) && admOrigFee > 0 ? Math.round(admOrigFee) : 12000,
    updatedAt: null,
    source: 'env',
  }
}

export function formatAmountLabel(paise) {
  const value = Number(paise) / 100
  if (!Number.isFinite(value)) return '₹1'
  if (Number.isInteger(value)) return `₹${value}`
  return `₹${value.toFixed(2)}`
}

export function formatRupeesLabel(rupees) {
  const value = Number(rupees)
  if (!Number.isFinite(value)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function invalidateCache() {
  memoryCache = null
  memoryCacheAt = 0
}

async function readMongoSettings() {
  const [amountRow, admFeeRow, admOrigFeeRow] = await Promise.all([
    col('settings').findOne({ key: KEYS.workshopAmountPaise }),
    col('settings').findOne({ key: KEYS.admissionFeeRupees }),
    col('settings').findOne({ key: KEYS.admissionOriginalFeeRupees }),
  ])

  const defaults = envDefaults()

  const workshopAmount = Number(amountRow?.value)
  const admFee = Number(admFeeRow?.value)
  const admOrigFee = Number(admOrigFeeRow?.value)

  if (!amountRow && !admFeeRow) return null

  return {
    workshopAmountPaise:
      amountRow && Number.isFinite(workshopAmount) && workshopAmount > 0
        ? Math.round(workshopAmount)
        : defaults.workshopAmountPaise,
    admissionFeeRupees:
      admFeeRow && Number.isFinite(admFee) && admFee > 0
        ? Math.round(admFee)
        : defaults.admissionFeeRupees,
    admissionOriginalFeeRupees:
      admOrigFeeRow && Number.isFinite(admOrigFee) && admOrigFee > 0
        ? Math.round(admOrigFee)
        : defaults.admissionOriginalFeeRupees,
    updatedAt: admFeeRow?.updatedAt || amountRow?.updatedAt || null,
    source: 'mongodb',
  }
}

export async function getAppSettings({ force = false } = {}) {
  const now = Date.now()
  if (!force && memoryCache && now - memoryCacheAt < CACHE_MS) {
    return memoryCache
  }

  let stored = null
  if (isMongoEnabled()) {
    try {
      stored = await readMongoSettings()
    } catch (error) {
      console.error('[settings] mongodb read failed', error.message)
    }
  }

  const settings = stored || envDefaults()
  memoryCache = settings
  memoryCacheAt = now
  return settings
}

export async function updateAppSettings(input = {}) {
  if (!isMongoEnabled()) {
    const error = new Error('Settings cannot be saved: database is not connected.')
    error.status = 503
    throw error
  }

  const current = await getAppSettings({ force: true })
  const next = { ...current }

  if (Object.prototype.hasOwnProperty.call(input, 'workshopAmountPaise')) {
    const amount = Number(input.workshopAmountPaise)
    if (!Number.isFinite(amount) || amount < 100 || amount > 10_000_000) {
      const error = new Error(
        'Subscription price must be between ₹1.00 and ₹100,000.00 (in paise: 100–10000000).',
      )
      error.status = 400
      throw error
    }
    next.workshopAmountPaise = Math.round(amount)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'amountRupees')) {
    const rupees = Number(input.amountRupees)
    if (!Number.isFinite(rupees) || rupees < 1 || rupees > 100_000) {
      const error = new Error('Subscription price must be between ₹1 and ₹100,000.')
      error.status = 400
      throw error
    }
    next.workshopAmountPaise = Math.round(rupees * 100)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'admissionFeeRupees')) {
    const rupees = Number(input.admissionFeeRupees)
    if (!Number.isFinite(rupees) || rupees < 1 || rupees > 100_000) {
      const error = new Error('Admission fee must be between ₹1 and ₹1,00,000.')
      error.status = 400
      throw error
    }
    next.admissionFeeRupees = Math.round(rupees)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'admissionOriginalFeeRupees')) {
    const rupees = Number(input.admissionOriginalFeeRupees)
    if (!Number.isFinite(rupees) || rupees < 1 || rupees > 100_000) {
      const error = new Error('Original (strike-through) fee must be between ₹1 and ₹1,00,000.')
      error.status = 400
      throw error
    }
    next.admissionOriginalFeeRupees = Math.round(rupees)
  }

  const now = new Date()

  await Promise.all([
    col('settings').updateOne(
      { key: KEYS.workshopAmountPaise },
      {
        $set: { value: String(next.workshopAmountPaise), updatedAt: now },
        $setOnInsert: { key: KEYS.workshopAmountPaise },
      },
      { upsert: true },
    ),
    col('settings').updateOne(
      { key: KEYS.admissionFeeRupees },
      {
        $set: { value: String(next.admissionFeeRupees), updatedAt: now },
        $setOnInsert: { key: KEYS.admissionFeeRupees },
      },
      { upsert: true },
    ),
    col('settings').updateOne(
      { key: KEYS.admissionOriginalFeeRupees },
      {
        $set: { value: String(next.admissionOriginalFeeRupees), updatedAt: now },
        $setOnInsert: { key: KEYS.admissionOriginalFeeRupees },
      },
      { upsert: true },
    ),
  ])

  invalidateCache()
  return getAppSettings({ force: true })
}

export function toPublicSettings(settings) {
  return {
    amountPaise: settings.workshopAmountPaise,
    amountLabel: formatAmountLabel(settings.workshopAmountPaise),
    admissionFeeRupees: settings.admissionFeeRupees,
    admissionFeePaise: settings.admissionFeeRupees * 100,
    admissionFeeLabel: formatRupeesLabel(settings.admissionFeeRupees),
    admissionOriginalFeeRupees: settings.admissionOriginalFeeRupees,
    admissionOriginalFeeLabel: formatRupeesLabel(settings.admissionOriginalFeeRupees),
    updatedAt: settings.updatedAt,
  }
}
