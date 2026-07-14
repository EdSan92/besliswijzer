import type { FlowNode, FlowResult, PublicFlowResponse } from '@besliswijzer/flow-schema'
import { resolveApiBase } from '~/utils/api-base'

export function useApiBase() {
  const config = useRuntimeConfig()
  if (import.meta.client) {
    // Same-origin proxy (/api/v1/public/*) — avoids CORS from veraio.nl to Railway API.
    return ''
  }
  const host = useRequestHeaders()['host']
  return resolveApiBase(config.public.apiBase as string, host)
}

export function useAdminFetch<T>(url: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
  const proxyUrl = url.replace('/api/v1/admin', '/api/admin')
  if (import.meta.server) {
    return useRequestFetch()<T>(proxyUrl, options)
  }
  return $fetch<T>(proxyUrl, options)
}

export type { FlowNode, FlowResult, PublicFlowResponse } from '@besliswijzer/flow-schema'
