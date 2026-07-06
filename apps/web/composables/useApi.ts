import type { FlowNode, FlowResult, PublicFlowResponse } from '@besliswijzer/flow-schema'
import { resolveApiBase } from '~/utils/api-base'

export function useApiBase() {
  const config = useRuntimeConfig()
  if (import.meta.server) {
    const host = useRequestHeaders()['host']
    return resolveApiBase(config.public.apiBase as string, host)
  }
  return config.public.apiBase as string
}

export function useAdminFetch<T>(url: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
  const proxyUrl = url.replace('/api/v1/admin', '/api/admin')
  if (import.meta.server) {
    return useRequestFetch()<T>(proxyUrl, options)
  }
  return $fetch<T>(proxyUrl, options)
}

export function toUserFacingFetchError(error: unknown, fallback = 'Er ging iets mis. Probeer het opnieuw.'): string {
  if (error && typeof error === 'object') {
    const data = (error as { data?: { error?: string } }).data
    if (data?.error === 'Invalid answer for node') {
      return 'Controleer je invoer en probeer het opnieuw.'
    }
    if (data?.error === 'Validation error') {
      return 'Je sessie is verlopen. Ververs de pagina en probeer opnieuw.'
    }
    if (data?.error) {
      return data.error
    }
  }

  return fallback
}

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export type { FlowNode, FlowResult, PublicFlowResponse } from '@besliswijzer/flow-schema'
