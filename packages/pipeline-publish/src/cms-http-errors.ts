import { PipelinePublishError } from './errors.js'

export type CmsHttpErrorContext = {
  status: number
  operation:
    | 'get_flow_version'
    | 'get_product_page_version'
    | 'upsert_flow'
    | 'upsert_product_page'
  resourceType: 'flow' | 'product_page'
  detail?: string
}

export function mapCmsHttpError(context: CmsHttpErrorContext): PipelinePublishError {
  if (context.status === 401 || context.status === 403) {
    return new PipelinePublishError(
      `CMS authentication failed during ${context.operation}`,
      'CMS_AUTH',
    )
  }

  if (context.status === 404 && context.resourceType === 'product_page') {
    return new PipelinePublishError(
      'Product page not found in CMS; create it before pipeline publish',
      'CMS_NOT_FOUND',
    )
  }

  const suffix = context.detail ? `: ${context.detail.slice(0, 200)}` : ''
  return new PipelinePublishError(
    `CMS ${context.operation} failed (${context.status})${suffix}`,
    'CMS_REQUEST_FAILED',
  )
}
