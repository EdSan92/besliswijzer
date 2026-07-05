/** Production API URL — override via API_BASE_URL or NUXT_PUBLIC_API_BASE on Railway. */
const DEFAULT_PRODUCTION_API_BASE = 'https://besliswijzerapi-production.up.railway.app'

export function resolveApiBase(configApiBase?: string): string {
  for (const key of ['API_BASE_URL', 'NUXT_PUBLIC_API_BASE'] as const) {
    const value = process.env[key]?.trim().replace(/\/$/, '')
    if (value) return value
  }

  if (process.env.NODE_ENV === 'production') {
    return DEFAULT_PRODUCTION_API_BASE
  }

  const fromConfig = configApiBase?.trim().replace(/\/$/, '')
  return fromConfig || 'http://localhost:3001'
}
