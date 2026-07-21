import { describe, expect, it } from 'vitest'
import { buildVisibleFlowSlugSet, type ProductFlowGroup } from './product-flow-group.js'

const robotGroup: ProductFlowGroup = {
  productId: '',
  productSlug: 'robotstofzuiger',
  productTitle: 'Robotstofzuiger',
  canonicalName: 'robotstofzuiger',
  categoryId: null,
  primaryFlowId: null,
  primaryFlowSlug: null,
  pageSlug: null,
  keywordTerms: [],
  flowIds: ['1', '2', '3'],
  flowSlugs: [
    'robotstofzuiger-met-zelfleegstation-keuzehulp',
    'beste-robotstofzuiger-dierenharen-keuzehulp',
    'robotstofzuiger-met-leegstation-keuzehulp',
  ],
}

describe('buildVisibleFlowSlugSet', () => {
  it('shows only one flow when multiple keyword flows belong to the same product', () => {
    const visible = buildVisibleFlowSlugSet(
      [robotGroup],
      robotGroup.flowSlugs,
    )

    expect(visible.size).toBe(1)
    expect(
      visible.has('robotstofzuiger-met-leegstation-keuzehulp') ||
        visible.has('robotstofzuiger-met-zelfleegstation-keuzehulp'),
    ).toBe(true)
  })

  it('prefers canonical product flow slug when published', () => {
    const visible = buildVisibleFlowSlugSet(
      [robotGroup],
      [...robotGroup.flowSlugs, 'robotstofzuigers'],
    )

    expect(visible.size).toBe(1)
    expect(visible.has('robotstofzuigers')).toBe(true)
  })
})
