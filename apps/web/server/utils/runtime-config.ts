import { resolveApiBase } from '~/utils/api-base'

export function getResolvedApiBase(configApiBase?: string, requestHost?: string): string {
  return resolveApiBase(configApiBase, requestHost)
}

export function getAdminApiKey(fallback?: string): string {
  return (
    process.env.NUXT_ADMIN_API_KEY?.trim() ||
    process.env.ADMIN_API_KEY?.trim() ||
    fallback ||
    'dev-admin-key'
  )
}
