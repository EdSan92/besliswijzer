import {
  MockContentPackageModelProvider,
  MOCK_CONTENT_PACKAGE_OUTPUT,
  readContentPackageConfigFromEnv,
} from '@besliswijzer/content-package'
import {
  MockFlowBriefModelProvider,
  MOCK_FLOW_BRIEF_OUTPUT,
  readFlowBriefConfigFromEnv,
} from '@besliswijzer/flow-brief'
import {
  GoogleKeywordInsightProvider,
  readGoogleKeywordInsightConfigFromEnv,
} from '@besliswijzer/keyword-research'
import {
  BesliswijzerCmsPublishProvider,
  FakeCmsPublishProvider,
  readCmsPublishConfigFromEnv,
  type CmsPublishProvider,
} from '@besliswijzer/pipeline-publish'
import type { ContentPackageModelProvider } from '@besliswijzer/content-package'
import type { FlowBriefModelProvider } from '@besliswijzer/flow-brief'
import type { KeywordResearchProvider } from '@besliswijzer/keyword-research'
import { GeminiStructuredClient } from './gemini-structured-client.js'
import { GeminiStructuredModelProvider } from './gemini-structured-model-provider.js'
import {
  readPipelineLiveConfigFromEnv,
  validatePipelineLiveConfig,
  type PipelineLiveConfig,
} from './pipeline-live-config.js'
import { logPipelineProviderMetrics } from './provider-metrics.js'

export type PipelineProviders = {
  keywordProvider: KeywordResearchProvider
  flowBriefProvider: FlowBriefModelProvider
  contentPackageProvider: ContentPackageModelProvider
  cmsPublishProvider: CmsPublishProvider
  liveConfig: PipelineLiveConfig
}

export type CreatePipelineProvidersOptions = {
  env?: NodeJS.ProcessEnv
  onAiMetrics?: (metrics: Parameters<typeof logPipelineProviderMetrics>[0]) => void
}

function createGeminiModelProvider(
  config: PipelineLiveConfig,
  model: string,
  onMetrics?: CreatePipelineProvidersOptions['onAiMetrics'],
): GeminiStructuredModelProvider {
  const client = new GeminiStructuredClient({
    apiKey: config.geminiApiKey!,
    model,
    timeoutMs: config.aiTimeoutMs,
    maxRetries: config.aiMaxRetries,
    maxOutputTokens: config.aiMaxOutputTokens,
    onMetrics: (metrics) => {
      logPipelineProviderMetrics(metrics)
      onMetrics?.(metrics)
    },
  })

  return new GeminiStructuredModelProvider({ client, model })
}

export function createPipelineProviders(
  options: CreatePipelineProvidersOptions = {},
): PipelineProviders {
  const env = options.env ?? process.env
  const liveConfig = readPipelineLiveConfigFromEnv(env)
  validatePipelineLiveConfig(liveConfig, { throwOnError: true })

  const flowBriefConfig = readFlowBriefConfigFromEnv(env)
  const contentPackageConfig = readContentPackageConfigFromEnv(env)
  const keywordConfig = readGoogleKeywordInsightConfigFromEnv(env)
  const cmsConfig = readCmsPublishConfigFromEnv(env)

  const keywordProvider = new GoogleKeywordInsightProvider({
    ...keywordConfig,
    mock:
      !liveConfig.useLiveProviders ||
      liveConfig.keywordMock ||
      keywordConfig.mock === true,
  })

  if (!liveConfig.useLiveProviders) {
    return {
      keywordProvider,
      flowBriefProvider: new MockFlowBriefModelProvider({
        initialResponse: MOCK_FLOW_BRIEF_OUTPUT,
      }),
      contentPackageProvider: new MockContentPackageModelProvider({
        initialResponse: MOCK_CONTENT_PACKAGE_OUTPUT,
      }),
      cmsPublishProvider: new FakeCmsPublishProvider(),
      liveConfig,
    }
  }

  const flowBriefProvider = createGeminiModelProvider(
    liveConfig,
    flowBriefConfig.model,
    options.onAiMetrics,
  )
  const contentPackageProvider = createGeminiModelProvider(
    liveConfig,
    contentPackageConfig.model,
    options.onAiMetrics,
  )

  const cmsPublishProvider = cmsConfig.mock
    ? new FakeCmsPublishProvider()
    : new BesliswijzerCmsPublishProvider({
        apiBase: cmsConfig.apiBase!,
        adminApiKey: cmsConfig.adminApiKey!,
      })

  return {
    keywordProvider,
    flowBriefProvider,
    contentPackageProvider,
    cmsPublishProvider,
    liveConfig,
  }
}
