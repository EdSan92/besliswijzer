export type CmsCallMetrics = {
  provider: string
  operation:
    | 'get_flow_version'
    | 'get_product_page_version'
    | 'upsert_flow'
    | 'upsert_product_page'
  resourceType: 'flow' | 'product_page'
  status: 'success' | 'error'
  httpStatus?: number
  latencyMs: number
}

export function logCmsProviderMetrics(metrics: CmsCallMetrics): void {
  console.info(
    JSON.stringify({
      event: 'pipeline.cms_call',
      provider: metrics.provider,
      operation: metrics.operation,
      resourceType: metrics.resourceType,
      status: metrics.status,
      httpStatus: metrics.httpStatus,
      latencyMs: metrics.latencyMs,
    }),
  )
}
