import { describe, expect, it } from 'vitest'
import { buildIdempotencyKey, pipelineRunSchema } from './model.js'
import {
  assertValidRunStatusTransition,
  canTransitionRunStatus,
  PIPELINE_RUN_TRANSITIONS,
} from './transitions.js'

describe('buildIdempotencyKey', () => {
  it('combines category, language, pipeline and input version', () => {
    expect(
      buildIdempotencyKey({
        categorySlug: 'airfryers',
        language: 'nl',
        pipelineVersion: '1.0.0',
        inputVersion: 'kw-2026-07',
      }),
    ).toBe('airfryers:nl:1.0.0:kw-2026-07')
  })
})

describe('pipeline run status transitions', () => {
  it('documents allowed transitions', () => {
    expect(PIPELINE_RUN_TRANSITIONS.queued).toEqual(['running'])
    expect(PIPELINE_RUN_TRANSITIONS.published).toEqual([])
  })

  it('allows valid transitions', () => {
    expect(canTransitionRunStatus('queued', 'running')).toBe(true)
    expect(canTransitionRunStatus('running', 'needs_review')).toBe(true)
    expect(canTransitionRunStatus('approved', 'published')).toBe(true)
    expect(canTransitionRunStatus('failed', 'queued')).toBe(true)
  })

  it('rejects invalid transitions', () => {
    expect(canTransitionRunStatus('queued', 'published')).toBe(false)
    expect(canTransitionRunStatus('published', 'queued')).toBe(false)
    expect(() => assertValidRunStatusTransition('queued', 'approved')).toThrow(/Invalid pipeline run status transition/)
  })
})

describe('pipelineRunSchema', () => {
  it('parses a run with nested steps and sources', () => {
    const run = pipelineRunSchema.parse({
      id: '00000000-0000-0000-0000-000000000001',
      idempotencyKey: 'airfryers:nl:1.0.0:kw-1',
      categorySlug: 'airfryers',
      language: 'nl',
      pipelineVersion: '1.0.0',
      inputVersion: 'kw-1',
      status: 'queued',
      steps: [
        {
          id: '00000000-0000-0000-0000-000000000002',
          runId: '00000000-0000-0000-0000-000000000001',
          stepKey: 'keyword_ingest',
          status: 'pending',
          sortOrder: 0,
        },
      ],
      artifacts: [],
      sources: [
        {
          id: '00000000-0000-0000-0000-000000000003',
          runId: '00000000-0000-0000-0000-000000000001',
          label: 'Keyword export',
          retrievedAt: '2026-07-28T12:00:00.000Z',
          assumption: false,
        },
      ],
      errors: [],
      createdAt: '2026-07-28T12:00:00.000Z',
      updatedAt: '2026-07-28T12:00:00.000Z',
    })

    expect(run.sources).toHaveLength(1)
  })
})
