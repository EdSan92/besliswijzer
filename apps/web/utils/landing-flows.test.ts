import { describe, expect, it } from 'vitest'
import { flattenPublishedFlows, resolvePopularFlows } from './landing-flows'

const source = {
  categories: [
    {
      title: 'Wonen',
      flows: [
        { id: '1', slug: 'warmtepomp', title: 'Warmtepomp' },
        { id: '2', slug: 'isolatie', title: 'Isolatie' },
      ],
    },
  ],
  uncategorized: [{ id: '3', slug: 'algemeen', title: 'Algemeen' }],
}

describe('landing-flows', () => {
  it('flattens categorized and uncategorized flows', () => {
    const items = flattenPublishedFlows(source)
    expect(items).toHaveLength(3)
    expect(items[0]).toMatchObject({ slug: 'warmtepomp', category: 'Wonen', starts: 0 })
    expect(items[2]).toMatchObject({ slug: 'algemeen', category: 'Keuzehulp' })
  })

  it('prefers popular endpoint data when available', () => {
    const popular = [
      { id: '9', slug: 'top', title: 'Top', category: 'Wonen', starts: 42 },
      { id: '8', slug: 'trend', title: 'Trend', category: 'Wonen', starts: 30 },
    ]
    const result = resolvePopularFlows(popular, source, 1)
    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('top')
  })

  it('falls back to flattened categories when popular is empty', () => {
    const result = resolvePopularFlows([], source, 2)
    expect(result).toHaveLength(2)
    expect(result[0]?.slug).toBe('warmtepomp')
  })
})
