import { describe, expect, it } from 'vitest'
import {
  deriveProductSlugFromKeyword,
  groupOpportunitiesByProduct,
  resolveProductFlowSlug,
} from './group-opportunities-by-product'
import type { OpportunityItem } from '~/types/opportunity'

function makeOpportunity(id: string, keyword: string, category = 'Tuin'): OpportunityItem {
  return {
    id,
    keywordTerm: keyword,
    categoryName: category,
    score: 80,
    confidence: 0.8,
    estimatedCommission: 10,
    status: 'NEW',
    discoveredAt: new Date().toISOString(),
  }
}

describe('groupOpportunitiesByProduct', () => {
  it('groups keyword opportunities under the same product slug', () => {
    const groups = groupOpportunitiesByProduct(
      [
        makeOpportunity('1', 'robotmaaier gps'),
        makeOpportunity('2', 'robotmaaier helling'),
      ],
      {},
    )

    expect(groups).toHaveLength(1)
    expect(groups[0]?.productSlug).toBe('robotmaaier')
    expect(groups[0]?.keywords).toEqual(['robotmaaier gps', 'robotmaaier helling'])
    expect(groups[0]?.opportunityIds).toEqual(['1', '2'])
  })

  it('uses product match metadata when available', () => {
    const groups = groupOpportunitiesByProduct([makeOpportunity('1', 'robotmaaier gps')], {
      '1': {
        productId: 'p1',
        productSlug: 'robotmaaier',
        productTitle: 'Robotmaaier',
        canonicalName: 'robotmaaier',
        pageSlug: 'robotmaaier-kiezen',
        categorySlug: 'tuin',
        confidence: 0.9,
        matchReason: 'canonical name overlap',
      },
    })

    expect(groups[0]?.pageSlug).toBe('robotmaaier-kiezen')
    expect(groups[0]?.productTitle).toBe('Robotmaaier')
  })
})

describe('deriveProductSlugFromKeyword', () => {
  it('extracts the main product token', () => {
    expect(deriveProductSlugFromKeyword('beste robotmaaier 2026')).toBe('robotmaaier')
  })
})

describe('resolveProductFlowSlug', () => {
  it('pluralizes product slug for canonical flow', () => {
    expect(resolveProductFlowSlug('robotmaaier')).toBe('robotmaaiers')
    expect(resolveProductFlowSlug('robotmaaiers')).toBe('robotmaaiers')
  })
})
