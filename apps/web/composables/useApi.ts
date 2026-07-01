import type { FlowNode, FlowResult, PublicFlowResponse } from '@besliswijzer/flow-schema'

export function useApiBase() {
  const config = useRuntimeConfig()
  return config.public.apiBase as string
}

export function useAdminFetch<T>(url: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
  const proxyUrl = url.replace('/api/v1/admin', '/api/admin')
  return $fetch<T>(proxyUrl, options)
}

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export type { FlowNode, FlowResult, PublicFlowResponse } from '@besliswijzer/flow-schema'
