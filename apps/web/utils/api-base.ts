/** Production API URL — override via API_BASE_URL or NUXT_PUBLIC_API_BASE on Railway. */
export const DEFAULT_PRODUCTION_API_BASE =
  'https://besliswijzerapi-production.up.railway.app'

function isProductionRuntime(requestHost?: string): boolean {
  if (process.env.NODE_ENV === 'production') return true
  if (process.env.RAILWAY_ENVIRONMENT) return true
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return true
  if (requestHost?.includes('railway.app')) return true
  if (requestHost?.includes('veraio.nl')) return true
  return false
}

export function resolveApiBase(configApiBase?: string, requestHost?: string): string {
  for (const key of ['API_BASE_URL', 'NUXT_PUBLIC_API_BASE'] as const) {
    const value = process.env[key]?.trim().replace(/\/$/, '')
    if (value && !value.includes('localhost')) return value
  }

  if (isProductionRuntime(requestHost)) {
    return DEFAULT_PRODUCTION_API_BASE
  }

  const fromConfig = configApiBase?.trim().replace(/\/$/, '')
  if (fromConfig && !fromConfig.includes('localhost')) return fromConfig

  return fromConfig || 'http://localhost:3001'
}
