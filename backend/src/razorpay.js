/**
 * Razorpay helpers for course admissions.
 * Admission fee is read dynamically from settingsStore so the admin can adjust it live.
 */
import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import { formatRupeesLabel, getAppSettings } from './settingsStore.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

export function getRazorpayKeyId() {
  return String(process.env.RAZORPAY_KEY_ID || '').trim()
}

export function getRazorpayKeySecret() {
  return String(process.env.RAZORPAY_KEY_SECRET || '').trim()
}

export function isRazorpayConfigured() {
  return Boolean(getRazorpayKeyId() && getRazorpayKeySecret())
}

/** Returns live admission pricing from settings (async). */
export async function getAdmissionPricing() {
  const settings = await getAppSettings()
  const feePaise = settings.admissionFeeRupees * 100
  const origPaise = settings.admissionOriginalFeeRupees * 100
  return {
    amountPaise: feePaise,
    originalAmountPaise: origPaise,
    amountRupees: settings.admissionFeeRupees,
    originalAmountRupees: settings.admissionOriginalFeeRupees,
    amountLabel: formatRupeesLabel(settings.admissionFeeRupees),
    originalAmountLabel: formatRupeesLabel(settings.admissionOriginalFeeRupees),
    currency: 'INR',
    duration: '3 months',
    jobAssistance: '100% job assistance',
  }
}

function getClient() {
  if (!isRazorpayConfigured()) {
    throw httpError(
      503,
      'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.',
    )
  }
  return new Razorpay({
    key_id: getRazorpayKeyId(),
    key_secret: getRazorpayKeySecret(),
  })
}

export async function createRazorpayOrder({ receipt, notes = {} }) {
  const client = getClient()
  const pricing = await getAdmissionPricing()
  const order = await client.orders.create({
    amount: pricing.amountPaise,
    currency: 'INR',
    receipt: String(receipt).slice(0, 40),
    notes,
  })
  return order
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  if (!isRazorpayConfigured()) {
    throw httpError(
      503,
      'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.',
    )
  }
  const body = `${orderId}|${paymentId}`
  const expected = crypto
    .createHmac('sha256', getRazorpayKeySecret())
    .update(body)
    .digest('hex')
  const left = Buffer.from(expected)
  const right = Buffer.from(String(signature || ''))
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}
