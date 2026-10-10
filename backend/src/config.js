/**
 * Shared runtime config helpers for local + Render production.
 */

const DEFAULT_ORIGINS = [
  'https://www.bizvyapar.in',
  'https://bizvyapar.in',
  'https://bizvyapar-in-frontend.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

export function getPort() {
  return Number(process.env.PORT || 5000)
}

export function getHost() {
  // Render (and most PaaS) require binding on 0.0.0.0
  return String(process.env.HOST || '0.0.0.0').trim() || '0.0.0.0'
}

export function getAllowedOrigins() {
  const fromEnv = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return [...new Set([...DEFAULT_ORIGINS, ...fromEnv])]
}

export function getRuntimeStatus() {
  const cors = getAllowedOrigins().length > 0
  const database = Boolean(
    String(process.env.MONGODB_URI || process.env.MONGO_URI || '').trim(),
  )
  const authJwt = Boolean(String(process.env.AUTH_JWT_SECRET || '').trim())

  const missing = []
  if (!cors) missing.push('CORS_ORIGIN')
  if (!database) missing.push('MONGODB_URI')
  if (!authJwt) missing.push('AUTH_JWT_SECRET')

  return {
    cors,
    database,
    authJwt,
    ready: cors && database && authJwt,
    missing,
  }
}
