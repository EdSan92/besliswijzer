import { describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { InMemoryPipelineRunStore } from '@besliswijzer/pipeline-schema'
import {
  createPipelineRun,
  transitionPipelineRunStatus,
} from '@besliswijzer/pipeline-schema'
import { publishApprovedPipelineRun } from './publish.js'
import { PipelinePublishError } from './errors.js'
import { FakeCmsPublishProvider } from './providers/fake-cms.provider.js'
import { minimalCompiledFlowPayload } from './fixtures/minimal-flow.js'

function createApprovedRun(options?: { includeContentPackage?: boolean }) {
  const now = '2026-07-28T12:00:00.000Z'
  let run = createPipelineRun({
    categorySlug: 'airfryers',
    language: 'nl',
    pipelineVersion: '1.0.0',
    inputVersion: 'pub-1',
    stepKeys: ['cms_publish'],
    now,
  })

  run = transitionPipelineRunStatus(run, 'running')
  run = transitionPipelineRunStatus(run, 'needs_review')
  run = transitionPipelineRunStatus(run, 'approved')

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

  if (options?.includeContentPackage) {
    run = {
      ...run,
      artifacts: [
        ...run.artifacts,
        {
          id: randomUUID(),
          runId: run.id,
          stepId,
          kind: 'content_package',
          version: 1,
          payload: {
            slug: 'airfryers',
            intro: 'Intro',
            buyingGuide: 'Guide',
            faq: [],
            metadata: { title: 'Airfryer', description: 'Desc' },
          },
          createdAt: now,
        },
      ],
    }
  }

  return run
}

describe('publishApprovedPipelineRun', () => {
  it('rejects runs that are not approved', async () => {
    const store = new InMemoryPipelineRunStore()
    const provider = new FakeCmsPublishProvider()
    let run = createPipelineRun({
      categorySlug: 'airfryers',
      language: 'nl',
      pipelineVersion: '1.0.0',
      inputVersion: 'pub-2',
      now: '2026-07-28T12:00:00.000Z',
    })
    run = await store.save(run)

    await expect(
      publishApprovedPipelineRun({ store, provider, runId: run.id }),
    ).rejects.toMatchObject({
      code: 'NOT_APPROVED',
    })
  })

  it('returns idempotently when the run is already published', async () => {
    const store = new InMemoryPipelineRunStore()
    const provider = new FakeCmsPublishProvider()
    let run = createApprovedRun()
    run = transitionPipelineRunStatus(run, 'published')
    run = await store.save(run)

    const result = await publishApprovedPipelineRun({ store, provider, runId: run.id })

    expect(result.alreadyPublished).toBe(true)
    expect(result.published).toBe(false)
    expect(provider.getCallCount()).toBe(0)
  })

  it('upserts compiled flow artifacts and marks the run published', async () => {
    const store = new InMemoryPipelineRunStore()
    const provider = new FakeCmsPublishProvider()
    const run = await store.save(createApprovedRun())

    const result = await publishApprovedPipelineRun({
      store,
      provider,
      runId: run.id,
      mode: 'draft',
      now: () => '2026-07-28T12:05:00.000Z',
    })

    expect(result.published).toBe(true)
    expect(result.flow?.remoteId).toBe('flow:airfryers:nl')
    expect(result.flow?.version).toBe(1)

    const saved = await store.findById(run.id)
    expect(saved?.status).toBe('published')
    expect(saved?.artifacts.some((artifact) => artifact.kind === 'publish_record')).toBe(true)
  })

  it('stops on optimistic version conflicts', async () => {
    const store = new InMemoryPipelineRunStore()
    const provider = new FakeCmsPublishProvider({ seedVersion: 3 })
    const run = await store.save(createApprovedRun())

    await expect(
      publishApprovedPipelineRun({ store, provider, runId: run.id, expectedFlowVersion: 2 }),
    ).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
    })

    const saved = await store.findById(run.id)
    expect(saved?.status).toBe('approved')
  })

  it('records partial publication state for recovery', async () => {
    const store = new InMemoryPipelineRunStore()
    const provider = new FakeCmsPublishProvider({ failOn: 'product_page' })
    const run = await store.save(createApprovedRun({ includeContentPackage: true }))

    await expect(
      publishApprovedPipelineRun({ store, provider, runId: run.id }),
    ).rejects.toBeInstanceOf(PipelinePublishError)

    const saved = await store.findById(run.id)
    const partial = saved?.artifacts.find((artifact) => artifact.kind === 'publish_record')
    expect(partial?.payload).toMatchObject({ status: 'partial', flowPublished: true })
  })
})
