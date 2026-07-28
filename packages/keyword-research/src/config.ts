export type GoogleKeywordInsightConfig = {
  mock?: boolean
  developerToken?: string
  customerId?: string
  accessToken?: string
  loginCustomerId?: string
  rateLimitMs?: number
  maxRetries?: number
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export function readGoogleKeywordInsightConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): GoogleKeywordInsightConfig {
  return {
    mock: env.GOOGLE_KEYWORD_INSIGHT_MOCK === 'true',
    developerToken: env.GOOGLE_ADS_DEVELOPER_TOKEN,
    customerId: env.GOOGLE_ADS_CUSTOMER_ID,
    accessToken: env.GOOGLE_ADS_ACCESS_TOKEN,
    loginCustomerId: env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    rateLimitMs: env.KEYWORD_API_RATE_LIMIT_MS
      ? Number(env.KEYWORD_API_RATE_LIMIT_MS)
      : 1100,
    maxRetries: env.KEYWORD_API_MAX_RETRIES ? Number(env.KEYWORD_API_MAX_RETRIES) : 3,
    timeoutMs: env.KEYWORD_API_TIMEOUT_MS ? Number(env.KEYWORD_API_TIMEOUT_MS) : 15_000,
  }
}

export function readKeywordResearchCacheTtlMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.KEYWORD_RESEARCH_CACHE_TTL_MS
  if (!raw) {
    return 86_400_000
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 86_400_000
}
