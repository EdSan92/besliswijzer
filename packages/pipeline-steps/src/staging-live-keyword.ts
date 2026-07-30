import {
  GoogleKeywordInsightProvider,
  readGoogleKeywordInsightConfigFromEnv,
  validateGoogleKeywordLiveConfig,
} from '@besliswijzer/keyword-research'
import {
  PipelineOrchestrator,
  createPipelineRun,
  type PipelineRunStore,
} from '@besliswijzer/pipeline-schema'
import { createKeywordIngestHandler } from './handlers/keyword-ingest.handler.js'
import { PIPELINE_STEP_KEYS, PIPELINE_VERSION } from './step-keys.js'

export const STAGING_LIVE_KEYWORD_CATEGORY = '__staging_live_keyword__'

export type RunStagingLiveKeywordIngestOptions = {
  store: PipelineRunStore
  provider?: GoogleKeywordInsightProvider
  env?: NodeJS.ProcessEnv
  primaryKeyword?: string
  language?: string
  runSuffix?: string
  now?: () => string
}

export type StagingLiveKeywordIngestResult = Awaited<
  ReturnType<typeof runStagingLiveKeywordIngest>
>

function createKeywordProvider(env: NodeJS.ProcessEnv): GoogleKeywordInsightProvider {
  const config = readGoogleKeywordInsightConfigFromEnv(env)
  validateGoogleKeywordLiveConfig(config, { throwOnError: true })
  return new GoogleKeywordInsightProvider(config)
}

export async function runStagingLiveKeywordIngest(
  options: RunStagingLiveKeywordIngestOptions,
) {
  const env = options.env ?? process.env
  const provider = options.provider ?? createKeywordProvider(env)
  const suffix = options.runSuffix ?? new Date().toISOString().replace(/[:.]/g, '-')
  const primaryKeyword = options.primaryKeyword ?? env.PIPELINE_STAGING_KEYWORD ?? 'airfryer kopen'
  const language = options.language ?? 'nl'

  const run = await options.store.save(
    createPipelineRun({
      categorySlug: STAGING_LIVE_KEYWORD_CATEGORY,
      language,
      pipelineVersion: PIPELINE_VERSION,
      inputVersion: `staging-live-keyword-${suffix}`,
      stepKeys: [PIPELINE_STEP_KEYS.KEYWORD_INGEST],
    }),
  )

  const orchestrator = new PipelineOrchestrator({
    store: options.store,
    handlers: [
      createKeywordIngestHandler({
        provider,
        now: options.now,
      }),
    ],
    now: options.now,
  })

  return orchestrator.start({
    runId: run.id,
    initialInput: {
      primaryKeyword,
      language,
      categoryTitle: env.PIPELINE_STAGING_CATEGORY ?? 'Airfryers',
    },
  })
}

export function assertStagingLiveKeywordConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (env.GOOGLE_KEYWORD_INSIGHT_MOCK !== 'false') {
    throw new Error('Set GOOGLE_KEYWORD_INSIGHT_MOCK=false before running staging live keyword ingest.')
  }

  validateGoogleKeywordLiveConfig(readGoogleKeywordInsightConfigFromEnv(env), {
    throwOnError: true,
  })
}
