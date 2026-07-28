import { randomUUID } from 'node:crypto'
import { MockFlowBriefModelProvider, MOCK_FLOW_BRIEF_OUTPUT } from '@besliswijzer/flow-brief'
import {
  MockContentPackageModelProvider,
  MOCK_CONTENT_PACKAGE_OUTPUT,
} from '@besliswijzer/content-package'
import { GoogleKeywordInsightProvider } from '@besliswijzer/keyword-research'
import {
  PipelineOrchestrator,
  createPipelineRun,
  transitionPipelineRunStatus,
  type PipelineRunStore,
} from '@besliswijzer/pipeline-schema'
import { FakeCmsPublishProvider, publishApprovedPipelineRun } from '@besliswijzer/pipeline-publish'
import {
  approvePipelineRun,
  rejectPipelineRun,
  updatePipelineRunArtifact,
} from '@besliswijzer/pipeline-review'
import { createDefaultPipelineHandlers } from './create-handlers.js'
import { DEFAULT_PIPELINE_STEP_KEYS } from './step-keys.js'

const STAGING_CATEGORY = '__staging_smoke__'

const contentFixtureOutput = {
  ...MOCK_CONTENT_PACKAGE_OUTPUT,
  claims: [],
  warnings: [],
}

const flowBriefFixture = MOCK_FLOW_BRIEF_OUTPUT

export type PipelineStagingSmokeResult = {
  primaryRunId: string
  checks: string[]
}

export type PipelineStagingSmokeOptions = {
  store: PipelineRunStore
  runSuffix?: string
  now?: () => string
}

function defaultNow(): string {
  return new Date().toISOString()
}

function countArtifacts(run: { artifacts: Array<{ kind: string; version: number }> }, kind: string) {
  return run.artifacts.filter((artifact) => artifact.kind === kind).length
}

export async function runPipelineStagingSmoke(
  options: PipelineStagingSmokeOptions,
): Promise<PipelineStagingSmokeResult> {
  const now = options.now ?? defaultNow
  const suffix = options.runSuffix ?? randomUUID().slice(0, 8)
  const checks: string[] = []

  const handlers = createDefaultPipelineHandlers({
    keywordProvider: new GoogleKeywordInsightProvider({ mock: true }),
    flowBriefProvider: new MockFlowBriefModelProvider({ initialResponse: flowBriefFixture }),
    contentPackageProvider: new MockContentPackageModelProvider({
      initialResponse: contentFixtureOutput,
    }),
    now,
  })

  const primaryRun = await options.store.save(
    createPipelineRun({
      categorySlug: STAGING_CATEGORY,
      language: 'nl',
      pipelineVersion: '1.0.0',
      inputVersion: `staging-primary-${suffix}`,
      stepKeys: [...DEFAULT_PIPELINE_STEP_KEYS],
      now: now(),
    }),
  )

  const orchestrator = new PipelineOrchestrator({ store: options.store, handlers, now })
  const completed = await orchestrator.start({
    runId: primaryRun.id,
    initialInput: {
      primaryKeyword: 'staging smoke test',
      categoryTitle: 'Staging smoke',
    },
  })

  if (completed.status !== 'needs_review') {
    throw new Error(`Expected needs_review, got ${completed.status}`)
  }
  checks.push('pipeline.completed')

  const latestFlowBrief = [...completed.artifacts]
    .filter((artifact) => artifact.kind === 'flow_brief')
    .sort((left, right) => right.version - left.version)[0]

  if (!latestFlowBrief) {
    throw new Error('Expected flow_brief artifact after pipeline completion')
  }

  const flowBriefPayload = latestFlowBrief.payload as {
    brief: (typeof flowBriefFixture)['brief']
    warnings?: unknown[]
  }

  const correctedPayload = {
    ...flowBriefPayload,
    brief: {
      ...flowBriefPayload.brief,
      title: `Staging smoke ${suffix}`,
    },
  }

  const corrected = await updatePipelineRunArtifact(
    options.store,
    completed.id,
    {
      kind: 'flow_brief',
      payload: correctedPayload,
      actor: 'staging-smoke@local',
      reason: 'Staging artifact correction check',
    },
    now,
  )
  checks.push('artifact.corrected')

  const reviewRecords = corrected.reviewRecords.filter((record) => record.action === 'corrected')
  if (reviewRecords.length === 0) {
    throw new Error('Expected review_record artifact after correction')
  }
  checks.push('review_record.stored')

  const approved = await approvePipelineRun(
    options.store,
    completed.id,
    { actor: 'staging-smoke@local' },
    now,
  )
  if (approved.run.status !== 'approved') {
    throw new Error(`Expected approved, got ${approved.run.status}`)
  }
  checks.push('run.approved')

  const provider = new FakeCmsPublishProvider()
  const firstPublish = await publishApprovedPipelineRun({
    store: options.store,
    provider,
    runId: completed.id,
    mode: 'draft',
    now,
  })

  if (!firstPublish.published) {
    throw new Error('Expected first publish to succeed')
  }
  checks.push('publish.first')

  const callsAfterFirst = provider.getCallCount()
  const secondPublish = await publishApprovedPipelineRun({
    store: options.store,
    provider,
    runId: completed.id,
    mode: 'draft',
    now,
  })

  if (!secondPublish.alreadyPublished || secondPublish.published) {
    throw new Error('Expected idempotent second publish')
  }
  if (provider.getCallCount() !== callsAfterFirst) {
    throw new Error('Idempotent publish must not call CMS again')
  }
  checks.push('publish.idempotent')

  let failFlowBrief = true
  const retryHandlers = createDefaultPipelineHandlers({
    keywordProvider: new GoogleKeywordInsightProvider({ mock: true }),
    flowBriefProvider: {
      provider: 'mock',
      model: 'mock-model',
      generateStructured: async () => {
        if (failFlowBrief) {
          throw new Error('forced flowbrief failure for staging retry')
        }
        return { raw: flowBriefFixture }
      },
    },
    contentPackageProvider: new MockContentPackageModelProvider({
      initialResponse: contentFixtureOutput,
    }),
    now,
  })

  const retryRun = await options.store.save(
    createPipelineRun({
      categorySlug: STAGING_CATEGORY,
      language: 'nl',
      pipelineVersion: '1.0.0',
      inputVersion: `staging-retry-${suffix}`,
      stepKeys: [...DEFAULT_PIPELINE_STEP_KEYS],
      now: now(),
    }),
  )

  const retryOrchestrator = new PipelineOrchestrator({
    store: options.store,
    handlers: retryHandlers,
    now,
  })

  const failed = await retryOrchestrator.start({
    runId: retryRun.id,
    initialInput: { primaryKeyword: 'staging retry' },
  })

  if (failed.status !== 'failed') {
    throw new Error(`Expected failed run before retry, got ${failed.status}`)
  }

  const artifactsBeforeRetry = countArtifacts(failed, 'flow_brief')
  failFlowBrief = false

  const resumed = await retryOrchestrator.retryStep({ runId: retryRun.id, stepKey: 'flow_brief' })
  const artifactsAfterRetry = countArtifacts(resumed, 'flow_brief')

  if (artifactsAfterRetry <= artifactsBeforeRetry) {
    throw new Error('Retry should persist a new flow_brief artifact version')
  }
  if (artifactsAfterRetry - artifactsBeforeRetry !== 1) {
    throw new Error('Retry must not create duplicate flow_brief artifacts')
  }
  checks.push('retry.no_duplicate_artifacts')

  let rejectRun = createPipelineRun({
    categorySlug: STAGING_CATEGORY,
    language: 'nl',
    pipelineVersion: '1.0.0',
    inputVersion: `staging-reject-${suffix}`,
    stepKeys: ['quality_gate'],
    now: now(),
  })
  rejectRun = transitionPipelineRunStatus(rejectRun, 'running')
  rejectRun = transitionPipelineRunStatus(rejectRun, 'needs_review')
  rejectRun = await options.store.save(rejectRun)

  const rejected = await rejectPipelineRun(
    options.store,
    rejectRun.id,
    {
      actor: 'staging-smoke@local',
      reason: 'Staging reject audit check',
    },
    now,
  )

  if (rejected.run.status !== 'failed') {
    throw new Error(`Expected failed after reject, got ${rejected.run.status}`)
  }
  if (rejected.reviewRecords.at(-1)?.action !== 'rejected') {
    throw new Error('Expected rejected review_record')
  }
  checks.push('reject.audit')

  return {
    primaryRunId: completed.id,
    checks,
  }
}
