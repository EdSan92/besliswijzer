import { describe, expect, it } from 'vitest'
import { buildLandingCategoryCards } from './landing-categories'

describe('buildLandingCategoryCards', () => {
  it('maps admin categories to landing cards with category links', () => {
    const cards = buildLandingCategoryCards([
      {
        slug: 'energie',
        title: 'Energie',
        description: 'Warmtepomp, isolatie en energiebesparing',
        flows: [{ id: '1', slug: 'warmtepomp-keuzehulp', title: 'Warmtepomp keuzehulp' }],
      },
      {
        slug: 'subsidie',
        title: 'Subsidie',
        description: null,
        flows: [],
      },
    ])

    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      slug: 'energie',
      title: 'Energie',
      href: '/categorie/energie',
      resultHint: '1 keuzehulp beschikbaar',
    })
  })
})
