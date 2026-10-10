import 'dotenv/config'
import app from './app.js'
import { getHost, getPort, getRuntimeStatus } from './config.js'
import { closeMongo, initMongo, isMongoConfigured, isMongoEnabled } from './db/mongo.js'

const PORT = getPort()
const HOST = getHost()
const isRender = Boolean(process.env.RENDER)
const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production'

if (isMongoConfigured()) {
  try {
    await initMongo()
  } catch (error) {
    console.error('[db] MongoDB connection failed:', error.message)
  }
} else {
  console.warn('[db] MONGODB_URI is not set — sign up, sign in and admin data are unavailable.')
}

if (!isMongoEnabled() && (isRender || isProduction)) {
  console.error('[db] FATAL: a working MONGODB_URI is required on Render/production.')
  process.exit(1)
}

const MONGO_RETRY_MS = 15_000
let mongoRetryTimer = null

function retryMongoLater() {
  mongoRetryTimer = setTimeout(async () => {
    try {
      await initMongo()
    } catch (error) {
      console.error(`[db] MongoDB still unreachable (${error.message}) — retrying in ${MONGO_RETRY_MS / 1000}s`)
      retryMongoLater()
    }
  }, MONGO_RETRY_MS)
  mongoRetryTimer.unref()
}

if (isMongoConfigured() && !isMongoEnabled()) retryMongoLater()

const server = app.listen(PORT, HOST, () => {
  const runtime = getRuntimeStatus()
  console.log(`Pranav One API listening on http://${HOST}:${PORT}`)
  console.log('[runtime]', {
    ready: runtime.ready,
    database: isMongoEnabled() ? 'mongodb' : 'none',
    cors: runtime.cors,
    missing: runtime.missing,
  })

  if (!runtime.ready) {
    console.warn(
      '[runtime] Server started, but some production env vars are missing:',
      runtime.missing.join(', '),
    )
  }
})

function shutdown(signal) {
  console.log(`[shutdown] ${signal} received, closing server...`)
  clearTimeout(mongoRetryTimer)
  server.close(async () => {
    await closeMongo().catch(() => undefined)
    process.exit(0)
  })

  setTimeout(() => {
    console.error('[shutdown] Forced exit after timeout')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('uncaughtException', (error) => {
  console.error('[fatal] uncaughtException', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection', reason)
})
