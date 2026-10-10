import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { getAllowedOrigins, getRuntimeStatus } from './config.js'
import { isMongoEnabled } from './db/mongo.js'
import { healthRouter } from './routes/health.js'
import { apiRouter } from './routes/api.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)

  const allowedOrigins = getAllowedOrigins()

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin / server-to-server / curl (no Origin header)
        if (!origin) {
          callback(null, true)
          return
        }

        if (
          allowedOrigins.length === 0 ||
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(origin)
        ) {
          callback(null, true)
          return
        }

        console.warn('[cors] blocked origin:', origin)
        callback(new Error(`CORS blocked for origin: ${origin}`))
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
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
