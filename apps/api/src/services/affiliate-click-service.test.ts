import { describe, expect, it } from 'vitest'
import { resolveAffiliateDestination } from './affiliate-click-service.js'

const snapshot = {
  flowId: '00000000-0000-0000-0000-000000000001',
  versionId: '00000000-0000-0000-0000-000000000002',
  versionNumber: 1,
  slug: 'robotstofzuigers',
  title: 'Robotstofzuiger',
  seo: { title: 't', description: 'd' },
  nodes: [],
  rules: [],
  results: [
    {
      resultKey: 'instap',
      title: 'Instap',
      body: {},
      ctas: [
        {
          id: 'aff-1',
          type: 'affiliate' as const,
          url: 'https://partner.example/robot',
          label: 'Bekijk',
          trackingId: 'aff-instap',
        },
      ],
    },
  ],
}

describe('resolveAffiliateDestination', () => {
  it('returns the known CTA url for valid flow result references', () => {
    const destination = resolveAffiliateDestination(snapshot, {
      flowSlug: 'robotstofzuigers',
      resultKey: 'instap',
      ctaId: 'aff-1',
      sessionId: '00000000-0000-0000-0000-000000000099',
    })
    expect(destination).toEqual({
      url: 'https://partner.example/robot',
      flowId: snapshot.flowId,
      flowVersionId: snapshot.versionId,
      trackingId: 'aff-instap',
      resultKey: 'instap',
      ctaId: 'aff-1',
    })
  })

  it('returns null for unknown cta ids', () => {
    const destination = resolveAffiliateDestination(snapshot, {
      flowSlug: 'robotstofzuigers',
      resultKey: 'instap',
      ctaId: 'unknown',
      sessionId: '00000000-0000-0000-0000-000000000099',
    })
    expect(destination).toBeNull()
  })
})
