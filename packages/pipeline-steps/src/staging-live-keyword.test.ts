import { describe, expect, it, vi } from 'vitest'
import { keywordResearchArtifactSchema } from '@besliswijzer/keyword-research'
import type { KeywordResearchProvider } from '@besliswijzer/keyword-research'
import { createPipelineRun, type PipelineRunStore } from '@besliswijzer/pipeline-schema'
import { runStagingLiveKeywordIngest, STAGING_LIVE_KEYWORD_CATEGORY } from './staging-live-keyword.js'
import { PIPELINE_STEP_KEYS, PIPELINE_VERSION } from './step-keys.js'

function createMemoryStore(): PipelineRunStore {
  const runs = new Map<string, ReturnType<typeof createPipelineRun>>()

  return {
    async findByIdempotencyKey(idempotencyKey) {
      return [...runs.values()].find((run) => run.idempotencyKey === idempotencyKey) ?? null
    },
    async findById(id) {
      return runs.get(id) ?? null
    },
    async save(run) {
      runs.set(run.id, run)
      return run
    },
    async list() {
      return [...runs.values()]
    },
  }
}

describe('runStagingLiveKeywordIngest', () => {
  it('runs only keyword ingest and stores keyword_data artifact', async () => {
    const store = createMemoryStore()
    const provider: KeywordResearchProvider = {
      name: 'test_provider',
      research: vi.fn(async () => ({
        primaryKeyword: 'airfryer kopen',
        variants: [
          {
            term: 'airfryer kopen',
            searchVolume: 1200,
            competition: 0.5,
          },
        ],
        questions: ['Welke airfryer?'],
        searchIntent: 'commercial',
        limitations: ['fixture'],
      })),
    }

    const result = await runStagingLiveKeywordIngest({
      store,
      provider,
      primaryKeyword: 'airfryer kopen',
      runSuffix: 'test',
    })

    expect(result.status).toBe('needs_review')
    expect(result.steps).toHaveLength(1)
    expect(result.steps[0]?.stepKey).toBe(PIPELINE_STEP_KEYS.KEYWORD_INGEST)
    expect(result.steps[0]?.status).toBe('completed')
    expect(result.artifacts).toHaveLength(1)
    expect(result.artifacts[0]?.kind).toBe('keyword_data')
    expect(keywordResearchArtifactSchema.parse(result.artifacts[0]?.payload)).toMatchObject({
      primaryKeyword: 'airfryer kopen',
      source: { provider: 'test_provider' },
    })
    expect(result.categorySlug).toBe(STAGING_LIVE_KEYWORD_CATEGORY)
    expect(provider.research).toHaveBeenCalledOnce()
  })
})
