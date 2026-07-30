import type { CmsPublishConfig } from './config.js'

export class CmsLiveConfigError extends Error {
  constructor(
    message: string,
    readonly missing: string[],
  ) {
    super(message)
    this.name = 'CmsLiveConfigError'
  }
}

export function validateCmsLiveConfig(
  config: CmsPublishConfig,
  options?: { throwOnError?: boolean },
):
  | { ok: true }
  | { ok: false; missing: string[] } {
  const missing: string[] = []

  if (config.mock !== false) {
    missing.push('CMS_PUBLISH_MOCK=false')
  }

  if (!config.apiBase?.trim()) {
    missing.push('BESLIJSWIJZER_API_BASE')
  }

  if (!config.adminApiKey?.trim()) {
    missing.push('ADMIN_API_KEY')
  }

  if (missing.length === 0) {
    return { ok: true }
  }

  if (options?.throwOnError) {
    throw new CmsLiveConfigError(
      `CMS live mode misconfigured: ${missing.join(', ')}`,
      missing,
    )
  }

  return { ok: false, missing }
}
