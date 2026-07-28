import { describe, expect, it } from 'vitest'
import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runPipelineStagingSmoke } from '@besliswijzer/pipeline-steps'
import { createDb, DrizzlePipelineRunStore } from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../.env') })

const shouldRun = process.env.PIPELINE_STAGING_SMOKE === 'true'
const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://decision:decision@localhost:5432/besliswijzer'

describe.runIf(shouldRun)('runPipelineStagingSmoke (Drizzle integration)', () => {
  it('persists review records and publish idempotency with DrizzlePipelineRunStore', async () => {
    const { db, client } = createDb(connectionString)
    const store = new DrizzlePipelineRunStore(db)
    const suffix = `db-${Date.now()}`

    try {
      const result = await runPipelineStagingSmoke({
        store,
        runSuffix: suffix,
        now: () => new Date().toISOString(),
      })

      expect(result.checks).toContain('review_record.stored')
      expect(result.checks).toContain('publish.idempotent')

      const detail = await store.findById(result.primaryRunId)
      expect(detail?.status).toBe('published')
      expect(detail?.artifacts.some((artifact) => artifact.kind === 'review_record')).toBe(true)
    } finally {
      await client.end()
    }
  })
})
