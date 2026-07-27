import { describe, expect, it } from 'vitest'
import { affiliateClickQuerySchema, analyticsEventSchema } from './index.js'

describe('analyticsEventSchema', () => {
  it('accepts page_view without flow identifiers when pageSlug is present', () => {
    const result = analyticsEventSchema.safeParse({
      sessionId: '00000000-0000-0000-0000-000000000099',
      eventType: 'page_view',
      metadata: { pageSlug: 'robotstofzuiger-kiezen', route: '/robotstofzuiger-kiezen' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects page_view without pageSlug', () => {
    const result = analyticsEventSchema.safeParse({
      sessionId: '00000000-0000-0000-0000-000000000099',
      eventType: 'page_view',
      metadata: {},
    })
    expect(result.success).toBe(false)
  })

  it('requires flow identifiers for flow_start', () => {
    const result = analyticsEventSchema.safeParse({
      sessionId: '00000000-0000-0000-0000-000000000099',
      eventType: 'flow_start',
      metadata: {},
    })
    expect(result.success).toBe(false)
  })

  it('accepts affiliate_click with flow context and product metadata', () => {
    const result = analyticsEventSchema.safeParse({
      flowId: '00000000-0000-0000-0000-000000000001',
      flowVersionId: '00000000-0000-0000-0000-000000000002',
      sessionId: '00000000-0000-0000-0000-000000000099',
      eventType: 'affiliate_click',
      metadata: {
        ctaId: 'aff-1',
        resultKey: 'instap',
        trackingId: 'aff-instap',
        productPosition: 1,
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('affiliateClickQuerySchema', () => {
  it('accepts known affiliate click parameters', () => {
    const result = affiliateClickQuerySchema.safeParse({
      flowSlug: 'robotstofzuigers',
      resultKey: 'instap',
      ctaId: 'aff-1',
      sessionId: '00000000-0000-0000-0000-000000000099',
    })
    expect(result.success).toBe(true)
  })

  it('rejects free-form destination urls', () => {
    const result = affiliateClickQuerySchema.safeParse({
      url: 'https://evil.example/phish',
      sessionId: '00000000-0000-0000-0000-000000000099',
    })
    expect(result.success).toBe(false)
  })
})
