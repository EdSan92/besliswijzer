import { DEFAULT_PRODUCTION_API_BASE, resolveApiBase } from '~/utils/api-base'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const host = getRequestHeader(event, 'host')

  return {
    apiBase: resolveApiBase(config.public.apiBase as string, host),
    configApiBase: config.public.apiBase,
    nodeEnv: process.env.NODE_ENV ?? null,
    railwayEnv: process.env.RAILWAY_ENVIRONMENT ?? null,
    hasNuxtPublicApiBase: Boolean(process.env.NUXT_PUBLIC_API_BASE),
    hasApiBaseUrl: Boolean(process.env.API_BASE_URL),
    host: host ?? null,
    defaultProductionApiBase: DEFAULT_PRODUCTION_API_BASE,
  }
})
