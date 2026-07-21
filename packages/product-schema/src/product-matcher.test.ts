import { describe, expect, it } from 'vitest'
import { pickBestProductMatch } from './product-matcher.js'

describe('pickBestProductMatch', () => {
  const catalog = [
    {
      id: '1',
      slug: 'robotmaaier',
      title: 'Robotmaaier',
      canonicalName: 'robotmaaier',
      categorySlug: 'tuin-en-buitenleven',
      categoryTitle: 'Tuin en buitenleven',
      keywordTerms: [],
      pageSlug: 'robotmaaier-kiezen',
    },
    {
      id: '2',
      slug: 'koptelefoon',
      title: 'Koptelefoon',
      canonicalName: 'koptelefoon',
      categorySlug: 'koptelefoon',
      categoryTitle: 'Koptelefoon',
      keywordTerms: [],
      pageSlug: null,
    },
  ]

  it('matches robotmaaier keyword to robotmaaier product', () => {
    const match = pickBestProductMatch('beste robotmaaier 2026', 'Tuin', catalog)
    expect(match?.productSlug).toBe('robotmaaier')
    expect(match?.pageSlug).toBe('robotmaaier-kiezen')
    expect(match?.confidence).toBeGreaterThan(0.35)
  })

  it('returns null when no product matches', () => {
    const match = pickBestProductMatch('warmtepomp subsidie', 'Energie', catalog)
    expect(match).toBeNull()
  })
})
