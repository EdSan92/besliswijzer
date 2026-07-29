export type PipelineLiveConfig = {
  useLiveProviders: boolean
  geminiApiKey?: string
  flowBriefProvider: string
  flowBriefModel: string
  contentPackageProvider: string
  contentPackageModel: string
  keywordMock: boolean
  googleAdsDeveloperToken?: string
  googleAdsCustomerId?: string
  googleAdsAccessToken?: string
  googleAdsLoginCustomerId?: string
  cmsPublishMock: boolean
  cmsApiBase?: string
  cmsAdminApiKey?: string
  aiTimeoutMs: number
  aiMaxRetries: number
  aiMaxOutputTokens: number
  keywordRateLimitMs: number
  keywordMaxRetries: number
  keywordTimeoutMs: number
}

export class PipelineLiveConfigError extends Error {
  constructor(
    message: string,
    readonly missing: string[],
  ) {
    super(message)
    this.name = 'PipelineLiveConfigError'
  }
}

export function readPipelineLiveConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): PipelineLiveConfig {
  return {
    useLiveProviders: env.PIPELINE_USE_LIVE_PROVIDERS === 'true',
    geminiApiKey: env.GEMINI_API_KEY,
    flowBriefProvider: env.FLOW_BRIEF_MODEL_PROVIDER ?? 'gemini',
    flowBriefModel: env.FLOW_BRIEF_MODEL_NAME ?? 'gemini-2.0-flash-lite',
    contentPackageProvider: env.CONTENT_PACKAGE_MODEL_PROVIDER ?? 'gemini',
    contentPackageModel: env.CONTENT_PACKAGE_MODEL_NAME ?? 'gemini-2.0-flash-lite',
    keywordMock: env.GOOGLE_KEYWORD_INSIGHT_MOCK === 'true',
    googleAdsDeveloperToken: env.GOOGLE_ADS_DEVELOPER_TOKEN,
    googleAdsCustomerId: env.GOOGLE_ADS_CUSTOMER_ID,
    googleAdsAccessToken: env.GOOGLE_ADS_ACCESS_TOKEN,
    googleAdsLoginCustomerId: env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    cmsPublishMock: env.CMS_PUBLISH_MOCK !== 'false',
    cmsApiBase: env.BESLIJSWIJZER_API_BASE ?? env.API_BASE,
    cmsAdminApiKey: env.ADMIN_API_KEY,
    aiTimeoutMs: Number(env.PIPELINE_AI_TIMEOUT_MS ?? 30_000),
    aiMaxRetries: Number(env.PIPELINE_AI_MAX_RETRIES ?? 2),
    aiMaxOutputTokens: Number(env.PIPELINE_AI_MAX_OUTPUT_TOKENS ?? 4096),
    keywordRateLimitMs: Number(env.KEYWORD_API_RATE_LIMIT_MS ?? 1100),
    keywordMaxRetries: Number(env.KEYWORD_API_MAX_RETRIES ?? 3),
    keywordTimeoutMs: Number(env.KEYWORD_API_TIMEOUT_MS ?? 15_000),
  }
}

export function validatePipelineLiveConfig(
  config: PipelineLiveConfig,
  options?: { throwOnError?: boolean },
):
  | { ok: true }
  | { ok: false; missing: string[] } {
  if (!config.useLiveProviders) {
    return { ok: true }
  }

  const missing: string[] = []

  if (!config.geminiApiKey?.trim()) {
    missing.push('GEMINI_API_KEY')
  }

  if (config.flowBriefProvider !== 'gemini') {
    missing.push('FLOW_BRIEF_MODEL_PROVIDER=gemini (only gemini supported)')
  }

  if (config.contentPackageProvider !== 'gemini') {
    missing.push('CONTENT_PACKAGE_MODEL_PROVIDER=gemini (only gemini supported)')
  }

  if (!config.keywordMock) {
    if (!config.googleAdsDeveloperToken) missing.push('GOOGLE_ADS_DEVELOPER_TOKEN')
    if (!config.googleAdsCustomerId) missing.push('GOOGLE_ADS_CUSTOMER_ID')
    if (!config.googleAdsAccessToken) missing.push('GOOGLE_ADS_ACCESS_TOKEN')
  }

  if (!config.cmsPublishMock) {
    if (!config.cmsApiBase?.trim()) missing.push('BESLIJSWIJZER_API_BASE')
    if (!config.cmsAdminApiKey?.trim()) missing.push('ADMIN_API_KEY')
  }

  if (missing.length === 0) {
    return { ok: true }
  }

  if (options?.throwOnError) {
    throw new PipelineLiveConfigError(
      `Pipeline live mode misconfigured: ${missing.join(', ')}`,
      missing,
    )
  }

  return { ok: false, missing }
}
