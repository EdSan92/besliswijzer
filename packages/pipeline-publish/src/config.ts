export type CmsPublishConfig = {
  mock: boolean
  apiBase?: string
  adminApiKey?: string
}

export function readCmsPublishConfigFromEnv(env: NodeJS.ProcessEnv = process.env): CmsPublishConfig {
  const useLiveProviders = env.PIPELINE_USE_LIVE_PROVIDERS === 'true'

  return {
    mock: !useLiveProviders || env.CMS_PUBLISH_MOCK !== 'false',
    apiBase: env.BESLIJSWIJZER_API_BASE ?? env.API_BASE,
    adminApiKey: env.ADMIN_API_KEY,
  }
}
