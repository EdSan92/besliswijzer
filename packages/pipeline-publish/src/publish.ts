import { randomUUID } from 'node:crypto'
import { createCompiledFlowArtefact, type CompiledFlowArtefact } from '@besliswijzer/flow-compiler'
import { contentPackageSchema, type ContentPackage } from '@besliswijzer/pipeline-quality'
import type { PipelineArtifact, PipelineRun } from '@besliswijzer/pipeline-schema'
import {
  transitionPipelineRunStatus,
  type PipelineRunStore,
} from '@besliswijzer/pipeline-schema'
import { CmsVersionConflictError, PipelinePublishError } from './errors.js'
import {
  createPublishRecord,
  type PublishPipelineRunResult,
  type PublishRecordResource,
} from './publish-record.js'
import type { CmsPublishMode, CmsPublishProvider } from './types.js'

export type PublishApprovedPipelineRunOptions = {
  store: PipelineRunStore
  provider: CmsPublishProvider
  runId: string
  mode?: CmsPublishMode
  expectedFlowVersion?: number | null
  expectedProductPageVersion?: number | null
  now?: () => string
}

function defaultNow(): string {
  return new Date().toISOString()
}

function findLatestArtifact(run: PipelineRun, kind: PipelineArtifact['kind']) {
  return [...run.artifacts]
    .filter((artifact) => artifact.kind === kind)
    .sort((left, right) => right.version - left.version)[0]
}

function parseCompiledFlowArtifact(artifact: PipelineArtifact): CompiledFlowArtefact {
  const payload = artifact.payload as Partial<CompiledFlowArtefact>
  if (payload.kind === 'compiled_flow' && payload.flow) {
    return createCompiledFlowArtefact(payload.flow)
  }
  if (payload.flow) {
    return createCompiledFlowArtefact(payload.flow as CompiledFlowArtefact['flow'])
  }
  throw new PipelinePublishError('Compiled flow artifact payload is invalid', 'MISSING_ARTIFACT')
}

function parseContentPackageArtifact(artifact: PipelineArtifact): ContentPackage {
  const parsed = contentPackageSchema.safeParse(artifact.payload)
  if (!parsed.success) {
    throw new PipelinePublishError('Content package artifact payload is invalid', 'MISSING_ARTIFACT')
  }
  return parsed.data
}

function buildVeraioId(run: PipelineRun): string {
  return `${run.categorySlug}:${run.language}`
}

export async function publishApprovedPipelineRun(
  options: PublishApprovedPipelineRunOptions,
): Promise<PublishPipelineRunResult> {
  const now = options.now ?? defaultNow
  const mode = options.mode ?? 'draft'
  const run = await options.store.findById(options.runId)

  if (!run) {
    throw new PipelinePublishError(`Pipeline run "${options.runId}" not found`, 'NOT_APPROVED')
  }

  if (run.status === 'published') {
    const existing = findLatestArtifact(run, 'publish_record')
    const record = existing
      ? createPublishRecord(existing.payload as PublishPipelineRunResult['record'])
      : createPublishRecord({
          runId: run.id,
          idempotencyKey: run.idempotencyKey,
          status: 'completed',
          flowPublished: true,
          productPagePublished: false,
          resources: [],
          publishedAt: run.updatedAt,
        })

    return {
      runId: run.id,
      idempotencyKey: run.idempotencyKey,
      published: false,
      alreadyPublished: true,
      record,
    }
  }

  if (run.status !== 'approved') {
    throw new PipelinePublishError(
      `Pipeline run must be approved before publish (current: ${run.status})`,
      'NOT_APPROVED',
    )
  }

  const compiledArtifact = findLatestArtifact(run, 'compiled_flow')
  if (!compiledArtifact) {
    throw new PipelinePublishError('Missing compiled_flow artifact', 'MISSING_ARTIFACT')
  }

  const compiled = parseCompiledFlowArtifact(compiledArtifact)
  const veraioId = buildVeraioId(run)
  const resources: PublishRecordResource[] = []
  let flowPublished = false
  let productPagePublished = false

  try {
    const actualFlowVersion = await options.provider.getFlowVersion(veraioId, run.language)
    if (
      options.expectedFlowVersion !== undefined &&
      options.expectedFlowVersion !== null &&
      actualFlowVersion !== null &&
      actualFlowVersion !== options.expectedFlowVersion
    ) {
      throw new CmsVersionConflictError('flow', options.expectedFlowVersion, actualFlowVersion)
    }

    const flowResult = await options.provider.upsertFlow({
      veraioId,
      locale: run.language,
      slug: compiled.flow.slug,
      flow: compiled.flow,
      expectedVersion: actualFlowVersion,
      mode,
    })

    flowPublished = true
    resources.push({
      type: 'flow',
      remoteId: flowResult.remoteId,
      version: flowResult.version,
      status: mode,
      publishedAt: flowResult.publishedAt,
      artifactVersion: compiledArtifact.version,
    })

    const contentArtifact = findLatestArtifact(run, 'content_package')
    if (contentArtifact) {
      const content = parseContentPackageArtifact(contentArtifact)
      const actualPageVersion = await options.provider.getProductPageVersion(veraioId, run.language)

      if (
        options.expectedProductPageVersion !== undefined &&
        options.expectedProductPageVersion !== null &&
        actualPageVersion !== null &&
        actualPageVersion !== options.expectedProductPageVersion
      ) {
        throw new CmsVersionConflictError(
          'product_page',
          options.expectedProductPageVersion,
          actualPageVersion,
        )
      }

      const pageResult = await options.provider.upsertProductPage({
        veraioId,
        locale: run.language,
        slug: content.slug,
        content,
        expectedVersion: actualPageVersion,
        mode,
      })

      productPagePublished = true
      resources.push({
        type: 'product_page',
        remoteId: pageResult.remoteId,
        version: pageResult.version,
        status: mode,
        publishedAt: pageResult.publishedAt,
        artifactVersion: contentArtifact.version,
      })
    }
  } catch (error) {
    const partialRecord = createPublishRecord({
      runId: run.id,
      idempotencyKey: run.idempotencyKey,
      status: 'partial',
      flowPublished,
      productPagePublished,
      resources,
      publishedAt: now(),
    })

    await options.store.save({
      ...run,
      artifacts: [
        ...run.artifacts,
        {
          id: randomUUID(),
          runId: run.id,
          stepId: run.steps[0]?.id ?? run.id,
          kind: 'publish_record',
          version: run.artifacts.filter((artifact) => artifact.kind === 'publish_record').length + 1,
          payload: partialRecord,
          createdAt: now(),
        },
      ],
      updatedAt: now(),
    })

    if (error instanceof PipelinePublishError) {
      throw error
    }

    throw new PipelinePublishError(
      error instanceof Error ? error.message : 'Publication failed',
      flowPublished || productPagePublished ? 'PARTIAL_PUBLISH' : 'NOT_APPROVED',
    )
  }

  const record = createPublishRecord({
    runId: run.id,
    idempotencyKey: run.idempotencyKey,
    status: 'completed',
    flowPublished,
    productPagePublished,
    resources,
    publishedAt: now(),
  })

  const publishedRun = transitionPipelineRunStatus(
    {
      ...run,
      artifacts: [
        ...run.artifacts,
        {
          id: randomUUID(),
          runId: run.id,
          stepId: run.steps[0]?.id ?? run.id,
          kind: 'publish_record',
          version: run.artifacts.filter((artifact) => artifact.kind === 'publish_record').length + 1,
          payload: record,
          createdAt: now(),
        },
      ],
    },
    'published',
  )

  await options.store.save(publishedRun)

  return {
    runId: run.id,
    idempotencyKey: run.idempotencyKey,
    published: true,
    alreadyPublished: false,
    flow: resources.find((resource) => resource.type === 'flow'),
    productPage: resources.find((resource) => resource.type === 'product_page'),
    record,
  }
}
