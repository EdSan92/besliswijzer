import { describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  createPipelineRun,
  transitionPipelineRunStatus,
  type PipelineRunStore,
} from '@besliswijzer/pipeline-schema'
import { approvePipelineRun } from '@besliswijzer/pipeline-review'
import { FakeCmsPublishProvider } from './providers/fake-cms.provider.js'
import { minimalCompiledFlowPayload } from './fixtures/minimal-flow.js'
import {
  runStagingLiveCmsPublish,
  STAGING_LIVE_CMS_CATEGORY,
} from './staging-live-cms.js'

function createMemoryStore(): PipelineRunStore {
  const runs = new Map<string, Awaited<ReturnType<PipelineRunStore['findById']>>>()

  return {
    async findByIdempotencyKey(idempotencyKey) {
      return [...runs.values()].find((run) => run?.idempotencyKey === idempotencyKey) ?? null
    },
    async findById(id) {
      return runs.get(id) ?? null
    },
    async save(run) {
      runs.set(run.id, run)
      return run
    },
    async list() {
      return [...runs.values()].filter((run): run is NonNullable<typeof run> => run !== null)
    },
  }
}

async function createNeedsReviewRun(store: PipelineRunStore, suffix: string) {
  const now = '2026-07-30T12:00:00.000Z'
  let run = createPipelineRun({
    categorySlug: STAGING_LIVE_CMS_CATEGORY,
    language: 'nl',
    pipelineVersion: '1.0.0',
    inputVersion: `staging-live-cms-${suffix}`,
    stepKeys: ['cms_publish'],
    now,
  })

  run = transitionPipelineRunStatus(run, 'running')
  run = transitionPipelineRunStatus(run, 'needs_review')

  const stepId = run.steps[0]!.id
  run = {
    ...run,
    artifacts: [
      {
        id: randomUUID(),
        runId: run.id,
        stepId,
        kind: 'compiled_flow',
        version: 1,
        payload: minimalCompiledFlowPayload,
        createdAt: now,
      },
    ],
  }

  return store.save(run)
}

describe('runStagingLiveCmsPublish', () => {
  it('approves a needs_review run and publishes idempotently', async () => {
    const store = createMemoryStore()
    const provider = new FakeCmsPublishProvider()
    const saved = await createNeedsReviewRun(store, 'test')

    const result = await runStagingLiveCmsPublish({
      store,
      provider,
      runId: saved.id,
      actor: 'staging-live-cms@test.local',
      now: () => '2026-07-30T12:05:00.000Z',
    })

    expect(result.checks).toEqual(
      expect.arrayContaining(['run.approved', 'publish.first', 'publish.idempotent']),
    )
    expect(result.first.published).toBe(true)
    expect(result.second.alreadyPublished).toBe(true)
    expect(result.second.published).toBe(false)
    expect(provider.getCallCount()).toBeGreaterThan(0)

    const published = await store.findById(saved.id)
    expect(published?.status).toBe('published')
  })

  it('skips approval when the run is already approved', async () => {
    const store = createMemoryStore()
    const provider = new FakeCmsPublishProvider()
    const saved = await createNeedsReviewRun(store, 'approved')
    await approvePipelineRun(store, saved.id, { actor: 'reviewer@test.local' })

    const approveSpy = vi.fn(approvePipelineRun)
    const result = await runStagingLiveCmsPublish({
      store,
      provider,
      runId: saved.id,
      approveRun: approveSpy,
      now: () => '2026-07-30T12:05:00.000Z',
    })

    expect(approveSpy).not.toHaveBeenCalled()
    expect(result.checks).not.toContain('run.approved')
    expect(result.first.published).toBe(true)
  })
})
