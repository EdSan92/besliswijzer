import { describe, expect, it } from 'vitest'
import { InMemoryPipelineRunStore } from './in-memory-store.js'
import {
  createOrGetPipelineRun,
  createPipelineRun,
  createPipelineRunStrict,
  DuplicatePipelineRunError,
  transitionPipelineRunStatus,
  updatePipelineStep,
} from './store.js'

describe('createPipelineRun', () => {
  it('creates a queued run with pending steps', () => {
    const run = createPipelineRun({
      categorySlug: 'robotstofzuigers',
      language: 'nl',
      pipelineVersion: '1.0.0',
      inputVersion: 'seed-1',
      stepKeys: ['keyword_ingest', 'flow_brief'],
      now: '2026-07-28T12:00:00.000Z',
    })

    expect(run.status).toBe('queued')
    expect(run.steps).toHaveLength(2)
    expect(run.idempotencyKey).toBe('robotstofzuigers:nl:1.0.0:seed-1')
  })
})

describe('transitionPipelineRunStatus', () => {
  it('updates status along the happy path', () => {
    const run = createPipelineRun({
      categorySlug: 'airfryers',
      language: 'nl',
      pipelineVersion: '1.0.0',
      inputVersion: 'v1',
      now: '2026-07-28T12:00:00.000Z',
    })

    const running = transitionPipelineRunStatus(run, 'running')
    const review = transitionPipelineRunStatus(running, 'needs_review')
    const approved = transitionPipelineRunStatus(review, 'approved')
    const published = transitionPipelineRunStatus(approved, 'published')

    expect(published.status).toBe('published')
  })
})

describe('updatePipelineStep', () => {
  it('records input, output, error and timestamps on a step', () => {
    const run = createPipelineRun({
      categorySlug: 'airfryers',
      language: 'nl',
      pipelineVersion: '1.0.0',
      inputVersion: 'v1',
      stepKeys: ['compile_flow'],
      now: '2026-07-28T12:00:00.000Z',
    })

    const stepId = run.steps[0]!.id
    const updated = updatePipelineStep(run, stepId, {
      status: 'running',
      input: { briefId: 'brief-1' },
      startedAt: '2026-07-28T12:01:00.000Z',
    })

    const completed = updatePipelineStep(updated, stepId, {
      status: 'completed',
      output: { flowSlug: 'airfryers' },
      finishedAt: '2026-07-28T12:02:00.000Z',
    })

    expect(completed.steps[0]?.output).toEqual({ flowSlug: 'airfryers' })
    expect(completed.steps[0]?.startedAt).toBe('2026-07-28T12:01:00.000Z')
  })
})

describe('InMemoryPipelineRunStore', () => {
  it('does not silently create duplicate runs for the same idempotency key', async () => {
    const store = new InMemoryPipelineRunStore()
    const input = {
      categorySlug: 'mesh-wifi',
      language: 'nl',
      pipelineVersion: '1.0.0',
      inputVersion: 'kw-1',
      now: '2026-07-28T12:00:00.000Z',
    }

    const first = await createOrGetPipelineRun(store, input)
    const second = await createOrGetPipelineRun(store, input)

    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.run.id).toBe(first.run.id)
  })

  it('throws on strict create when idempotency key already exists', async () => {
    const store = new InMemoryPipelineRunStore()
    const input = {
      categorySlug: 'mesh-wifi',
      language: 'nl',
      pipelineVersion: '1.0.0',
      inputVersion: 'kw-1',
    }

    await createPipelineRunStrict(store, input)
    await expect(createPipelineRunStrict(store, input)).rejects.toBeInstanceOf(DuplicatePipelineRunError)
  })
})
