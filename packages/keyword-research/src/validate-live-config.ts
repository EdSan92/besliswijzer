import type { GoogleKeywordInsightConfig } from './config.js'

export class GoogleKeywordLiveConfigError extends Error {
  constructor(
    message: string,
    readonly missing: string[],
  ) {
    super(message)
    this.name = 'GoogleKeywordLiveConfigError'
  }
}

export function validateGoogleKeywordLiveConfig(
  config: GoogleKeywordInsightConfig,
  options?: { throwOnError?: boolean },
):
  | { ok: true }
  | { ok: false; missing: string[] } {
  const missing: string[] = []

  if (config.mock !== false) {
    missing.push('GOOGLE_KEYWORD_INSIGHT_MOCK=false')
  }

  if (!config.developerToken?.trim()) {
    missing.push('GOOGLE_ADS_DEVELOPER_TOKEN')
  }

  if (!config.customerId?.trim()) {
    missing.push('GOOGLE_ADS_CUSTOMER_ID')
  }

  if (!config.accessToken?.trim()) {
    missing.push('GOOGLE_ADS_ACCESS_TOKEN')
  }

  if (missing.length === 0) {
    return { ok: true }
  }

  if (options?.throwOnError) {
    throw new GoogleKeywordLiveConfigError(
      `Google keyword live mode misconfigured: ${missing.join(', ')}`,
      missing,
    )
  }

  return { ok: false, missing }
}
