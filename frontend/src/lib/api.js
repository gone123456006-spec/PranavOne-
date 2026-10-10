/**
 * API base URL helper.
 * - Local dev: empty base → /api goes through the Vite proxy to the local backend
 * - Production build: VITE_API_BASE_URL if set, otherwise the Render API below
 */
const PRODUCTION_API_URL = 'https://pranavone-api.onrender.com'

const RAW_BASE = String(
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? PRODUCTION_API_URL : ''),
).trim()

export function getApiBaseUrl() {
  return RAW_BASE.replace(/\/$/, '')
}

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = getApiBaseUrl()
  return base ? `${base}${normalized}` : normalized
}
