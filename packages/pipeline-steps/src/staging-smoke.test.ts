import { describe, expect, it } from 'vitest'
import { InMemoryPipelineRunStore } from '@besliswijzer/pipeline-schema'
import { runPipelineStagingSmoke } from './staging-smoke.js'

describe('runPipelineStagingSmoke', () => {
  it('validates review, correction, approve, idempotent publish, retry and reject', async () => {
    const store = new InMemoryPipelineRunStore()
    const result = await runPipelineStagingSmoke({
      store,
      runSuffix: 'unit',
      now: () => '2026-07-28T21:00:00.000Z',
    })

    expect(result.checks).toEqual([
      'pipeline.completed',
      'artifact.corrected',
      'review_record.stored',
      'run.approved',
      'publish.first',
      'publish.idempotent',
      'retry.no_duplicate_artifacts',
      'reject.audit',
    ])
  })
})
