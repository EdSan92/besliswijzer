import { describe, expect, it } from 'vitest'
import { selectDeprecatedFlowIds } from './archive-product-flows-service.js'
import type { ProductFlowGroup } from '@besliswijzer/product-schema'

const baseGroup: ProductFlowGroup = {
  productId: 'p1',
  productSlug: 'robotmaaier',
  productTitle: 'Robotmaaier',
  canonicalName: 'robotmaaier',
  categoryId: null,
  primaryFlowId: 'f1',
  primaryFlowSlug: 'robotmaaiers',
  pageSlug: 'robotmaaier-kiezen',
  keywordTerms: [],
  flowIds: ['f1', 'f2', 'f3'],
  flowSlugs: ['robotmaaiers', 'robotmaaier-gps', 'robotmaaier-helling'],
}

describe('selectDeprecatedFlowIds', () => {
  it('returns all flow ids except the canonical flow', () => {
    expect(selectDeprecatedFlowIds(baseGroup, 'f1')).toEqual(['f2', 'f3'])
  })

  it('returns empty when only canonical flow exists', () => {
    expect(
      selectDeprecatedFlowIds(
        { ...baseGroup, flowIds: ['f1'], flowSlugs: ['robotmaaiers'] },
        'f1',
      ),
    ).toEqual([])
  })
})
