import { describe, expect, it } from 'vitest'
import { buildBetaAnalyticsReport } from './analytics-service.js'

describe('buildBetaAnalyticsReport', () => {
  it('aggregates page views, funnel metrics and affiliate clicks per category', () => {
    const report = buildBetaAnalyticsReport([
      {
        eventType: 'page_view',
        categorySlug: 'tech-schoonmaak',
        categoryTitle: 'Schoonmaak',
        productSlug: 'robotstofzuiger-kiezen',
        flowSlug: 'robotstofzuigers',
      },
      {
        eventType: 'flow_start',
        categorySlug: 'tech-schoonmaak',
        categoryTitle: 'Schoonmaak',
        flowSlug: 'robotstofzuigers',
      },
      {
        eventType: 'flow_complete',
        categorySlug: 'tech-schoonmaak',
        categoryTitle: 'Schoonmaak',
        flowSlug: 'robotstofzuigers',
      },
      {
        eventType: 'affiliate_click',
        categorySlug: 'tech-schoonmaak',
        categoryTitle: 'Schoonmaak',
        flowSlug: 'robotstofzuigers',
        trackingId: 'aff-instap',
        productPosition: 1,
      },
    ])

    expect(report.totals.pageViews).toBe(1)
    expect(report.totals.flowStarts).toBe(1)
    expect(report.totals.flowCompletions).toBe(1)
    expect(report.totals.affiliateClicks).toBe(1)
    expect(report.totals.completionRate).toBe(100)
    expect(report.totals.clickThroughRate).toBe(100)
    expect(report.byCategory[0]).toMatchObject({
      categorySlug: 'tech-schoonmaak',
      pageViews: 1,
      flowStarts: 1,
      flowCompletions: 1,
      affiliateClicks: 1,
    })
    expect(report.byProduct[0]).toMatchObject({
      trackingId: 'aff-instap',
      affiliateClicks: 1,
    })
  })
})
