import { describe, expect, it } from 'vitest'
import { buildAffiliateClickHref } from './affiliate-link'

describe('buildAffiliateClickHref', () => {
  it('builds a shared tracking route without free-form destination urls', () => {
    const href = buildAffiliateClickHref({
      flowSlug: 'robotstofzuigers',
      resultKey: 'instap',
      ctaId: 'aff-1',
      sessionId: '00000000-0000-0000-0000-000000000099',
    })

    expect(href).toContain('/api/v1/public/affiliate/click?')
    expect(href).toContain('flowSlug=robotstofzuigers')
    expect(href).not.toContain('url=')
  })
})
