import { Router } from 'express'
import { getRuntimeStatus } from '../config.js'
import { isMongoEnabled } from '../db/mongo.js'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  const runtime = getRuntimeStatus()

  res.json({
    status: 'ok',
    service: 'pranavone-api',
    timestamp: new Date().toISOString(),
    platform: process.env.RENDER ? 'render' : process.env.VERCEL ? 'vercel' : 'local',
    ready: runtime.ready,
    database: isMongoEnabled() ? 'mongodb' : 'none',
    checks: {
      cors: runtime.cors,
      database: isMongoEnabled(),
    },
    missing: runtime.missing,
  })
})
