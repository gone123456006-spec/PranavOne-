/**
 * TredsDash admin session auth (password + signed bearer token).
 */

import crypto from 'node:crypto'

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const DASHBOARD_NAME = 'TredsDash'

export function getAdminDashboardName() {
  return String(process.env.ADMIN_DASHBOARD_NAME || DASHBOARD_NAME).trim() || DASHBOARD_NAME
}

export function getAdminPassword() {
  return String(process.env.ADMIN_PASSWORD || '').trim()
}

export function getAdminUsername() {
  return String(process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase() || 'admin'
}

/** Sub-admin: sales team login that can only use the Sales (leads) section. */
export function getSubAdmin() {
  const username = String(process.env.SUBADMIN_USERNAME || '').trim().toLowerCase()
  const password = String(process.env.SUBADMIN_PASSWORD || '').trim()
  return username && password ? { username, password } : null
}

export const ADMIN_ROLES = ['admin', 'subadmin']

/** Changes when the sub-admin password changes, so old sub-admin sessions stop working. */
function subAdminKeyVersion() {
  const sub = getSubAdmin()
  return sub ? crypto.createHash('sha256').update(`sub:${sub.username}:${sub.password}`).digest('hex').slice(0, 16) : ''
}

function getSessionSecret() {
  const explicit = String(process.env.ADMIN_SESSION_SECRET || '').trim()
  if (explicit) return explicit
  const password = getAdminPassword()
  if (!password) return ''
  // Derive a stable secret when ADMIN_SESSION_SECRET is not set.
  return crypto.createHash('sha256').update(`tredsdash:${password}`).digest('hex')
}

export function isAdminConfigured() {
  return Boolean(getAdminPassword() && getSessionSecret())
}

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromB64url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return Buffer.from(padded + pad, 'base64').toString('utf8')
}

function sign(payloadB64) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

export function verifyAdminPassword(password) {
  const expected = getAdminPassword()
  if (!expected) return false
  return safeEqual(password, expected)
}

/** Returns { role, username } for valid credentials, otherwise null. Blank username means the main admin. */
export function verifyAdminLogin(username, password) {
  const name = String(username || '').trim().toLowerCase()
  if (!name || name === getAdminUsername()) {
    return verifyAdminPassword(password) ? { role: 'admin', username: getAdminUsername() } : null
  }
  const sub = getSubAdmin()
  if (sub && safeEqual(name, sub.username) && safeEqual(password, sub.password)) {
    return { role: 'subadmin', username: sub.username }
  }
  return null
}

export function createAdminToken({ role = 'admin', username = getAdminUsername() } = {}) {
  if (!isAdminConfigured()) {
    const error = new Error('TredsDash admin password is not configured on the server.')
    error.status = 503
    throw error
  }

  const payload = {
    role,
    username,
    ...(role === 'subadmin' ? { kv: subAdminKeyVersion() } : {}),
    dash: getAdminDashboardName(),
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  }
  const payloadB64 = b64url(JSON.stringify(payload))
  return `${payloadB64}.${sign(payloadB64)}`
}

export function verifyAdminToken(token) {
  if (!token || !isAdminConfigured()) return null
  const parts = String(token).split('.')
  if (parts.length !== 2) return null
  const [payloadB64, signature] = parts
  if (!safeEqual(sign(payloadB64), signature)) return null

  try {
    const payload = JSON.parse(fromB64url(payloadB64))
    if (!payload || !ADMIN_ROLES.includes(payload.role)) return null
    if (payload.role === 'subadmin' && (!getSubAdmin() || payload.kv !== subAdminKeyVersion())) return null
    if (!payload.exp || Date.now() > Number(payload.exp)) return null
    return payload
  } catch {
    return null
  }
}

function authenticate(req, res, roles, next) {
  try {
    if (!isAdminConfigured()) {
      return res.status(503).json({
        message: 'TredsDash is not configured. Set ADMIN_PASSWORD on the server.',
      })
    }

    const header = String(req.headers.authorization || '')
    const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    const headerToken = String(req.headers['x-admin-token'] || '').trim()
    const token = bearer || headerToken
    const session = verifyAdminToken(token)

    if (!session) {
      return res.status(401).json({ message: 'Admin session expired. Please sign in again.' })
    }

    if (!roles.includes(session.role)) {
      return res.status(403).json({ message: 'Your login does not have access to this section.' })
    }

    req.admin = session
    next()
  } catch (error) {
    next(error)
  }
}

/** Full admin only. */
export function requireAdmin(req, res, next) {
  return authenticate(req, res, ['admin'], next)
}

/** Admin or sub-admin (Sales section). */
export function requireSales(req, res, next) {
  return authenticate(req, res, ADMIN_ROLES, next)
}
