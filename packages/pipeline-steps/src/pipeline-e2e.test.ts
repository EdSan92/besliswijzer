import { describe, expect, it } from 'vitest'
import { validGenerationOutput as flowBriefFixture } from '../../flow-brief/src/fixtures/generation-output.js'
import { validGenerationOutput as contentFixture } from '../../content-package/src/fixtures/generation-output.js'
import { MockFlowBriefModelProvider } from '@besliswijzer/flow-brief'
import { MockContentPackageModelProvider } from '@besliswijzer/content-package'
import { GoogleKeywordInsightProvider } from '@besliswijzer/keyword-research'
import {
  InMemoryPipelineRunStore,
  PipelineOrchestrator,
  createPipelineRun,
  transitionPipelineRunStatus,
} from '@besliswijzer/pipeline-schema'
import { publishApprovedPipelineRun } from '@besliswijzer/pipeline-publish'
import { FakeCmsPublishProvider } from '@besliswijzer/pipeline-publish'
import {
  approvePipelineRun,
  rejectPipelineRun,
} from '@besliswijzer/pipeline-review'
import {
  DEFAULT_PIPELINE_STEP_KEYS,
  PipelineObservability,
  createDefaultPipelineHandlers,
  createStructuredPipelineLog,
} from './index.js'

const FIXED_NOW = '2026-07-28T12:00:00.000Z'
const now = () => FIXED_NOW

const contentFixtureOutput = {
  ...contentFixture,
  claims: [],
  warnings: [],
}

describe('pipeline end-to-end fixture', () => {
  it('runs keyword → flowbrief → compile → content → quality and supports review + publish', async () => {
    const store = new InMemoryPipelineRunStore()
    const observability = new PipelineObservability()
    const handlers = createDefaultPipelineHandlers({
      keywordProvider: new GoogleKeywordInsightProvider({ mock: true }),
      flowBriefProvider: new MockFlowBriefModelProvider({ initialResponse: flowBriefFixture }),
      contentPackageProvider: new MockContentPackageModelProvider({
        initialResponse: contentFixtureOutput,
      }),
      now,
    })

    const run = await store.save(
      createPipelineRun({
        categorySlug: 'airfryers',
        language: 'nl',
        pipelineVersion: '1.0.0',
        inputVersion: 'e2e-1',
        stepKeys: [...DEFAULT_PIPELINE_STEP_KEYS],
        now: FIXED_NOW,
      }),
    )

    observability.log({
      level: 'info',
      runId: run.id,
      event: 'run.started',
    })

    const orchestrator = new PipelineOrchestrator({ store, handlers, now })
    const completed = await orchestrator.start({
      runId: run.id,
      initialInput: {
        primaryKeyword: 'airfryer kopen',
        categoryTitle: 'Airfryer keuzehulp',
      },
    })

    observability.log({
      level: 'info',
      runId: run.id,
      event: completed.status === 'needs_review' ? 'run.completed' : 'run.failed',
    })

    expect(completed.status).toBe('needs_review')

    expect(completed.artifacts.some((artifact) => artifact.kind === 'quality_report')).toBe(true)

    const { buildQualityReportForRun } = await import('@besliswijzer/pipeline-review')
    const report = buildQualityReportForRun(completed)
    expect(report.hasBlockingErrors).toBe(false)

    const approved = await approvePipelineRun(store, completed.id, { actor: 'reviewer@test.local' })
    expect(approved.run.status).toBe('approved')

    const provider = new FakeCmsPublishProvider()
    const publishResult = await publishApprovedPipelineRun({
      store,
      provider,
      runId: approved.run.id,
      mode: 'draft',
      now,
    })

    expect(publishResult.published).toBe(true)

    const metrics = observability.getMetrics()
    expect(metrics.runsStarted).toBe(1)
    expect(createStructuredPipelineLog({
      level: 'info',
      runId: run.id,
      event: 'run.completed',
    })).not.toHaveProperty('prompt')
  })

  it('resumes after a forced step failure', async () => {
    const store = new InMemoryPipelineRunStore()
    let failFlowBrief = true

    const handlers = createDefaultPipelineHandlers({
      keywordProvider: new GoogleKeywordInsightProvider({ mock: true }),
      flowBriefProvider: {
        provider: 'mock',
        model: 'mock-model',
        generateStructured: async () => {
          if (failFlowBrief) {
            throw new Error('forced flowbrief failure')
          }
          return { raw: flowBriefFixture }
        },
      },
      contentPackageProvider: new MockContentPackageModelProvider({
        initialResponse: contentFixtureOutput,
      }),
      now,
    })

    const run = await store.save(
      createPipelineRun({
        categorySlug: 'airfryers',
        language: 'nl',
        pipelineVersion: '1.0.0',
        inputVersion: 'e2e-resume-1',
        stepKeys: [...DEFAULT_PIPELINE_STEP_KEYS],
        now: FIXED_NOW,
      }),
    )

    const orchestrator = new PipelineOrchestrator({ store, handlers, now })
    const failed = await orchestrator.start({
      runId: run.id,
      initialInput: { primaryKeyword: 'airfryer kopen' },
    })

    expect(failed.status).toBe('failed')
    failFlowBrief = false

    const resumed = await orchestrator.retryStep({ runId: run.id, stepKey: 'flow_brief' })
    expect(resumed.status).toBe('needs_review')
  })

  it('records reject audit trail', async () => {
    const store = new InMemoryPipelineRunStore()
    let run = createPipelineRun({
      categorySlug: 'airfryers',
      language: 'nl',
      pipelineVersion: '1.0.0',
      inputVersion: 'e2e-reject-1',
      stepKeys: ['quality_gate'],
      now: FIXED_NOW,
    })
    run = transitionPipelineRunStatus(run, 'running')
    run = transitionPipelineRunStatus(run, 'needs_review')
    run = await store.save(run)

    const detail = await rejectPipelineRun(store, run.id, {
      actor: 'reviewer@test.local',
      reason: 'Onvoldoende bronverwijzingen',
    })

    expect(detail.run.status).toBe('failed')
    expect(detail.reviewRecords.at(-1)?.action).toBe('rejected')
  })
})
