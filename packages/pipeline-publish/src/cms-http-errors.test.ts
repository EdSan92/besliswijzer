import { describe, expect, it } from 'vitest'
import { mapCmsHttpError } from './cms-http-errors.js'
import { PipelinePublishError } from './errors.js'

describe('mapCmsHttpError', () => {
  it('maps auth failures', () => {
    const error = mapCmsHttpError({
      status: 401,
      operation: 'upsert_flow',
      resourceType: 'flow',
    })

    expect(error).toBeInstanceOf(PipelinePublishError)
    expect(error.code).toBe('CMS_AUTH')
  })

  it('maps missing product pages', () => {
    const error = mapCmsHttpError({
      status: 404,
      operation: 'upsert_product_page',
      resourceType: 'product_page',
    })

    expect(error.code).toBe('CMS_NOT_FOUND')
  })

  it('maps other HTTP failures', () => {
    const error = mapCmsHttpError({
      status: 503,
      operation: 'get_flow_version',
      resourceType: 'flow',
    })

    expect(error.code).toBe('CMS_REQUEST_FAILED')
  })
})
