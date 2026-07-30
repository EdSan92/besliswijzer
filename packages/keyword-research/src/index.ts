export {
  KEYWORD_RESEARCH_ARTIFACT_VERSION,
  createKeywordResearchArtifact,
  keywordResearchArtifactSchema,
  keywordResearchSourceSchema,
  keywordVariantSchema,
  searchIntentSchema,
} from './artifact.js'
export type {
  CreateKeywordResearchArtifactInput,
  KeywordResearchArtifact,
  KeywordResearchSource,
  KeywordVariant,
  SearchIntent,
} from './artifact.js'

export {
  buildKeywordResearchCacheKey,
  KeywordResearchCache,
} from './cache.js'
export type { KeywordResearchCacheOptions } from './cache.js'

export {
  DEFAULT_KEYWORD_RESEARCH_CACHE_TTL_MS,
  createKeywordResearchCache,
  ingestKeywordResearch,
} from './ingest.js'
export type { IngestKeywordResearchOptions } from './ingest.js'

export {
  readGoogleKeywordInsightConfigFromEnv,
  readKeywordResearchCacheTtlMs,
} from './config.js'
export type { GoogleKeywordInsightConfig } from './config.js'

export {
  validateGoogleKeywordLiveConfig,
  GoogleKeywordLiveConfigError,
} from './validate-live-config.js'

export { logKeywordProviderMetrics } from './provider-metrics.js'
export type { KeywordCallMetrics } from './provider-metrics.js'

export { KeywordResearchError, normalizeProviderError } from './errors.js'
export type { KeywordResearchErrorCode } from './errors.js'

export { knownMetric, metricValueSchema, toMetricValue, unknownMetric } from './metric-value.js'
export type { MetricValue } from './metric-value.js'

export { normalizeProviderResult } from './normalize.js'

export { GoogleKeywordInsightProvider } from './providers/google-keyword-insight.provider.js'

export type {
  KeywordResearchProvider,
  KeywordResearchProviderResult,
  KeywordResearchRequest,
  KeywordResearchVariantInput,
} from './types.js'
