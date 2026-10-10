/**
 * Pre-deploy / post-deploy env check for Render.
 * Exits 0 when critical production vars are present; exits 1 otherwise.
 *
 * Usage: node scripts/check-env.js
 */
import 'dotenv/config'
import { getRuntimeStatus } from '../src/config.js'

const runtime = getRuntimeStatus()

console.log('BizVyapar env check')
console.log(
  JSON.stringify(
    {
      ready: runtime.ready,
      checks: {
        cors: runtime.cors,
        database: runtime.database,
        authJwt: runtime.authJwt,
      },
      missing: runtime.missing,
    },
    null,
    2,
  ),
)

if (!runtime.ready) {
  console.error(
    '\nMissing required production variables. Add them in Render → Environment before going live.',
  )
  process.exit(1)
}

console.log('\nAll required production env vars look set.')
process.exit(0)
