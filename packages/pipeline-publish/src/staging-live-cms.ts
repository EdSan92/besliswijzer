import { randomUUID } from 'node:crypto'
import type { PipelineRun, PipelineRunStore } from '@besliswijzer/pipeline-schema'
import {
  createPipelineRun,
  transitionPipelineRunStatus,
} from '@besliswijzer/pipeline-schema'
import { approvePipelineRun } from '@besliswijzer/pipeline-review'
import { readCmsPublishConfigFromEnv } from './config.js'
import { publishApprovedPipelineRun } from './publish.js'
import type { PublishPipelineRunResult } from './publish-record.js'
import { BesliswijzerCmsPublishProvider } from './providers/besliswijzer-cms.provider.js'
import type { CmsPublishProvider } from './types.js'
import { validateCmsLiveConfig } from './validate-live-config.js'
import { minimalCompiledFlowPayload } from './fixtures/minimal-flow.js'
import type { ContentPackage } from '@besliswijzer/pipeline-quality'

export const STAGING_LIVE_CMS_CATEGORY = '__staging_live_cms__'

export type RunStagingLiveCmsPublishOptions = {
  store: PipelineRunStore
  provider?: CmsPublishProvider
  env?: NodeJS.ProcessEnv
  runId?: string
  actor?: string
  flowSlug?: string
  productPageSlug?: string
  includeProductPage?: boolean
  approveRun?: typeof approvePipelineRun
  now?: () => string
}

export type StagingLiveCmsPublishResult = {
  runId: string
  first: PublishPipelineRunResult
  second: PublishPipelineRunResult
  checks: string[]
}

function defaultNow(): string {
  return new Date().toISOString()
}

function readStagingCmsConfig(env: NodeJS.ProcessEnv) {
  return {
    mock: env.CMS_PUBLISH_MOCK !== 'false',
    apiBase: env.BESLIJSWIJZER_API_BASE ?? env.API_BASE,
    adminApiKey: env.ADMIN_API_KEY,
  }
}

function createLiveCmsProvider(env: NodeJS.ProcessEnv): BesliswijzerCmsPublishProvider {
  const config = readStagingCmsConfig(env)
  validateCmsLiveConfig(config, { throwOnError: true })
  return new BesliswijzerCmsPublishProvider({
    apiBase: config.apiBase!,
    adminApiKey: config.adminApiKey!,
  })
}

function buildContentPackage(slug: string): ContentPackage {
  return {
    slug,
    intro: 'Staging CMS live validation intro.',
    buyingGuide: 'Staging CMS live validation guide.',
    faq: [{ question: 'Test?', answer: 'Staging validation.' }],
    metadata: {
      title: `Staging CMS ${slug}`,
      description: 'Controlled staging CMS publish validation.',
    },
  }
}

export async function createStagingCmsReviewRun(
  store: PipelineRunStore,
  options?: {
    suffix?: string
    flowSlug?: string
    productPageSlug?: string
    includeProductPage?: boolean
    now?: () => string
  },
): Promise<PipelineRun> {
  const now = options?.now ?? defaultNow
  const suffix = options?.suffix ?? randomUUID().slice(0, 8)
  const flowSlug = options?.flowSlug ?? `staging-cms-${suffix}`

  let run = createPipelineRun({
    categorySlug: STAGING_LIVE_CMS_CATEGORY,
    language: 'nl',
    pipelineVersion: '1.0.0',
    inputVersion: `staging-live-cms-${suffix}`,
    stepKeys: ['cms_publish'],
    now: now(),
  })

  run = transitionPipelineRunStatus(run, 'running')
  run = transitionPipelineRunStatus(run, 'needs_review')

  const stepId = run.steps[0]!.id
  const compiledPayload = {
    ...minimalCompiledFlowPayload,
    flow: {
      ...minimalCompiledFlowPayload.flow,
      slug: flowSlug,
    },
  }

  const artifacts: PipelineRun['artifacts'] = [
    {
      id: randomUUID(),
      runId: run.id,
      stepId,
      kind: 'compiled_flow',
      version: 1,
      payload: compiledPayload,
      createdAt: now(),
    },
  ]

  const productPageSlug = options?.productPageSlug
  if (options?.includeProductPage && productPageSlug) {
    artifacts.push({
      id: randomUUID(),
      runId: run.id,
      stepId,
      kind: 'content_package',
      version: 1,
      payload: buildContentPackage(productPageSlug),
      createdAt: now(),
    })
  }

  return store.save({ ...run, artifacts })
}

export function assertStagingLiveCmsConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (env.CMS_PUBLISH_MOCK !== 'false') {
    throw new Error('Set CMS_PUBLISH_MOCK=false before running staging live CMS publish.')
  }

  validateCmsLiveConfig(readStagingCmsConfig(env), { throwOnError: true })
}

export async function runStagingLiveCmsPublish(
  options: RunStagingLiveCmsPublishOptions,
): Promise<StagingLiveCmsPublishResult> {
  const env = options.env ?? process.env
  const now = options.now ?? defaultNow
  const approveRun = options.approveRun ?? approvePipelineRun
  const actor = options.actor ?? 'staging-live-cms@local'
  const provider = options.provider ?? createLiveCmsProvider(env)
  const checks: string[] = []

  let run =
    options.runId !== undefined
      ? await options.store.findById(options.runId)
      : await createStagingCmsReviewRun(options.store, {
          flowSlug: options.flowSlug,
          productPageSlug: options.productPageSlug,
          includeProductPage: options.includeProductPage,
          now,
        })

  if (!run) {
    throw new Error(`Pipeline run "${options.runId}" not found`)
  }

  if (run.status === 'needs_review') {
    const approved = await approveRun(options.store, run.id, { actor }, now)
    run = approved.run
    checks.push('run.approved')
  }

  if (run.status !== 'approved' && run.status !== 'published') {
    throw new Error(`Run must be approved or published before CMS publish (current: ${run.status})`)
  }

  const first = await publishApprovedPipelineRun({
    store: options.store,
    provider,
    runId: run.id,
    mode: 'draft',
    now,
  })

  if (first.alreadyPublished) {
    checks.push('publish.already_published')
  } else if (first.published) {
    checks.push('publish.first')
  } else {
    throw new Error('Expected first CMS publish to succeed')
  }

  const callsBeforeSecond =
    provider instanceof BesliswijzerCmsPublishProvider
      ? undefined
      : 'getCallCount' in provider && typeof provider.getCallCount === 'function'
        ? provider.getCallCount()
        : undefined

  const second = await publishApprovedPipelineRun({
    store: options.store,
    provider,
    runId: run.id,
    mode: 'draft',
    now,
  })

  if (!second.alreadyPublished || second.published) {
    throw new Error('Expected idempotent second CMS publish')
  }

  if (
    callsBeforeSecond !== undefined &&
    'getCallCount' in provider &&
    typeof provider.getCallCount === 'function' &&
    provider.getCallCount() !== callsBeforeSecond
  ) {
    throw new Error('Idempotent publish must not call CMS again')
  }

  checks.push('publish.idempotent')

  return {
    runId: run.id,
    first,
    second,
    checks,
  }
}
