import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { getAllowedOrigins, getRuntimeStatus } from './config.js'
import { isMongoEnabled } from './db/mongo.js'
import { healthRouter } from './routes/health.js'
import { apiRouter } from './routes/api.js'

const TRUSTED_ROOT_DOMAINS = ['pranavone.in']

function originHost(origin) {
  try {
    return new URL(origin).host.toLowerCase()
  } catch {
    return ''
  }
}

function isOriginAllowed(origin, req, allowedOrigins) {
  if (!origin) return true
  if (allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    return true
  }

  const host = originHost(origin)
  if (!host) return false

  // The site and API can share one host (e.g. Vercel serving /api), whatever CORS_ORIGIN says.
  const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
  if (requestHost && host === requestHost) return true

  const hostname = host.split(':')[0]
  return TRUSTED_ROOT_DOMAINS.some((root) => hostname === root || hostname.endsWith(`.${root}`))
}

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)

  const allowedOrigins = getAllowedOrigins()

  const baseCorsOptions = {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }

  app.use(
    cors((req, callback) => {
      const origin = req.headers.origin
      if (isOriginAllowed(origin, req, allowedOrigins)) {
        callback(null, { ...baseCorsOptions, origin: true })
        return
      }

      console.warn('[cors] blocked origin:', origin)
      callback(new Error(`CORS blocked for origin: ${origin}`))
    }),
  )

  app.use(express.json({ limit: '1mb' }))

  // Lightweight keep-alive / uptime ping (no DB work).
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'pranavone-api',
      timestamp: new Date().toISOString(),
    })
  })

  app.get('/', (_req, res) => {
    const runtime = getRuntimeStatus()
    res.json({
      status: 'ok',
      service: 'pranavone-api',
      message: 'Pranav One API is running.',
      health: '/health',
      ready: runtime.ready,
      database: isMongoEnabled() ? 'mongodb' : 'none',
    })
  })

  app.use('/api/health', healthRouter)
  app.use('/api', apiRouter)

  app.use((err, _req, res, _next) => {
    console.error(err)
    res.status(err.status || 500).json({
      message: err.message || 'Internal server error',
    })
  })

  return app
}

const app = createApp()
export default app
