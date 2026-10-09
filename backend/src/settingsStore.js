/**
 * Runtime app settings (webinar link, workshop price).
 * Stored in MongoDB; env vars are fallbacks until an admin saves overrides.
 */

import { col, isMongoEnabled } from './db/mongo.js'

const KEYS = {
  webinarLink: 'webinar_link',
  workshopAmountPaise: 'workshop_amount_paise',
}

let memoryCache = null
let memoryCacheAt = 0
const CACHE_MS = 2_000

function envDefaults() {
  const paise = Number(process.env.WORKSHOP_AMOUNT_PAISE || 100)
  return {
    webinarLink: String(process.env.WEBINAR_LINK || '').trim(),
    workshopAmountPaise: Number.isFinite(paise) && paise > 0 ? Math.round(paise) : 100,
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

function invalidateCache() {
  memoryCache = null
  memoryCacheAt = 0
}

async function readMongoSettings() {
  const rows = await col('settings')
    .find({ key: { $in: [KEYS.webinarLink, KEYS.workshopAmountPaise] } })
    .toArray()
  if (!rows.length) return null

  const map = Object.fromEntries(rows.map((row) => [row.key, row]))
  const defaults = envDefaults()
  const webinarRow = map[KEYS.webinarLink]
  const amountRow = map[KEYS.workshopAmountPaise]
  const amount = Number(amountRow?.value)
  return {
    webinarLink:
      String(webinarRow?.value || '').trim() || defaults.webinarLink,
    workshopAmountPaise:
      Number.isFinite(amount) && amount > 0
        ? Math.round(amount)
        : defaults.workshopAmountPaise,
    updatedAt: webinarRow?.updatedAt || amountRow?.updatedAt || null,
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

  if (Object.prototype.hasOwnProperty.call(input, 'webinarLink')) {
    const link = String(input.webinarLink || '').trim()
    if (link && !/^https?:\/\//i.test(link)) {
      const error = new Error('Webinar link must start with http:// or https://')
      error.status = 400
      throw error
    }
    next.webinarLink = link
  }

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

  const now = new Date()
  await Promise.all([
    col('settings').updateOne(
      { key: KEYS.webinarLink },
      {
        $set: { value: String(next.webinarLink || ''), updatedAt: now },
        $setOnInsert: { key: KEYS.webinarLink },
      },
      { upsert: true },
    ),
    col('settings').updateOne(
      { key: KEYS.workshopAmountPaise },
      {
        $set: { value: String(next.workshopAmountPaise), updatedAt: now },
        $setOnInsert: { key: KEYS.workshopAmountPaise },
      },
      { upsert: true },
    ),
  ])

  invalidateCache()
  return getAppSettings({ force: true })
}

export function toPublicSettings(settings) {
  const raw = String(settings.webinarLink || '').trim()
  const webinarLink =
    !raw || /your-webinar-link|example\.com|localhost/i.test(raw)
      ? 'https://www.bizvyapar.in'
      : raw
  return {
    webinarLink,
    amountPaise: settings.workshopAmountPaise,
    amountLabel: formatAmountLabel(settings.workshopAmountPaise),
    updatedAt: settings.updatedAt,
  }
}
