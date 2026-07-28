import { describe, expect, it } from 'vitest'
import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb } from './index.js'
import { verifyMigration0006 } from './verify-migration-0006.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../.env') })

const shouldRun = process.env.PIPELINE_STAGING_SMOKE === 'true'
const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://decision:decision@localhost:5432/besliswijzer'

describe.runIf(shouldRun)('verifyMigration0006 (integration)', () => {
  it('reports review_record enum value on a migrated database', async () => {
    const { db, client } = createDb(connectionString)
    try {
      const result = await verifyMigration0006(db)
      expect(result.ok).toBe(true)
      expect(result.message).toContain('review_record')
    } finally {
      await client.end()
    }
  })
})
