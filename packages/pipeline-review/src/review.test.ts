import { describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { InMemoryPipelineRunStore } from '@besliswijzer/pipeline-schema'
import {
  createPipelineRun,
  transitionPipelineRunStatus,
} from '@besliswijzer/pipeline-schema'
import {
  approvePipelineRun,
  getPipelineRunDetail,
  rejectPipelineRun,
  updatePipelineRunArtifact,
} from './review.js'

const now = () => '2026-07-28T12:00:00.000Z'

function createReviewableRun() {
  let run = createPipelineRun({
    categorySlug: 'airfryers',
    language: 'nl',
    pipelineVersion: '1.0.0',
    inputVersion: 'review-1',
    stepKeys: ['quality_gate'],
    now: now(),
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
        kind: 'content_package',
        version: 1,
        payload: {
          content: {
            slug: 'airfryers',
            intro: 'Intro met voldoende context voor airfryers.',
            buyingGuide: 'Koopgids met praktische tips over capaciteit en functies.',
            faq: [{ question: 'Wat is een airfryer?', answer: 'Een compact heteluchtapparaat.' }],
            metadata: {
              title: 'Airfryer kopen: keuzehulp voor capaciteit en budget',
              description:
                'Ontdek welke airfryer past bij jouw huishouden met onze praktische koopgids en FAQ.',
            },
          },
          claims: [],
        },
        createdAt: now(),
      },
    ],
  }

  return run
}

describe('pipeline review service', () => {
  it('returns run detail with quality report', async () => {
    const store = new InMemoryPipelineRunStore()
    const run = await store.save(createReviewableRun())

    const detail = await getPipelineRunDetail(store, run.id)

    expect(detail.summary.status).toBe('needs_review')
    expect(detail.qualityReport.score).toBeGreaterThan(0)
  })

  it('creates a corrected artifact version with audit record', async () => {
    const store = new InMemoryPipelineRunStore()
    const run = await store.save(createReviewableRun())

    const detail = await updatePipelineRunArtifact(store, run.id, {
      kind: 'content_package',
      actor: 'admin@test.local',
      reason: 'Metadata aangescherpt',
      payload: {
        content: {
          slug: 'airfryers',
          intro: 'Intro met voldoende context voor airfryers.',
          buyingGuide: 'Koopgids met praktische tips over capaciteit en functies.',
          faq: [{ question: 'Wat is een airfryer?', answer: 'Een compact heteluchtapparaat.' }],
          metadata: {
            title: 'Airfryer kopen: uitgebreide keuzehulp voor capaciteit en budget',
            description:
              'Ontdek welke airfryer past bij jouw huishouden met onze praktische koopgids en FAQ.',
          },
        },
        claims: [],
      },
    })

    const versions = detail.run.artifacts.filter((artifact) => artifact.kind === 'content_package')
    expect(versions).toHaveLength(2)
    expect(detail.reviewRecords.some((record) => record.action === 'corrected')).toBe(true)
    expect(detail.corrections.some((entry) => entry.kind === 'content_package')).toBe(true)
  })

  it('rejects invalid artifact corrections', async () => {
    const store = new InMemoryPipelineRunStore()
    const run = await store.save(createReviewableRun())

    await expect(
      updatePipelineRunArtifact(store, run.id, {
        kind: 'content_package',
        actor: 'admin@test.local',
        payload: { content: { slug: 'x' } },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PAYLOAD' })
  })

  it('approves runs without blocking quality errors', async () => {
    const store = new InMemoryPipelineRunStore()
    const run = await store.save(createReviewableRun())

    const detail = await approvePipelineRun(store, run.id, { actor: 'admin@test.local' })

    expect(detail.run.status).toBe('approved')
    expect(detail.reviewRecords.some((record) => record.action === 'approved')).toBe(true)
  })

  it('requires a reason when rejecting', async () => {
    const store = new InMemoryPipelineRunStore()
    const run = await store.save(createReviewableRun())

    await expect(
      rejectPipelineRun(store, run.id, { actor: 'admin@test.local', reason: '   ' }),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' })
  })
})
