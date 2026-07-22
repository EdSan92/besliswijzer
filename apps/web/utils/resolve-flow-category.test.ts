import { describe, expect, it } from 'vitest'
import {
  categorySlugForCreate,
  findMatchingCategory,
  inferCategoryTitleFromKeyword,
} from './resolve-flow-category'

const categories = [
  { id: '1', slug: 'robotstofzuiger', title: 'Robotstofzuiger' },
  { id: '2', slug: 'koptelefoon', title: 'Koptelefoon' },
  { id: '3', slug: 'airfryer', title: 'Airfryer' },
]

describe('inferCategoryTitleFromKeyword', () => {
  it('maps product keywords to seed categories', () => {
    expect(inferCategoryTitleFromKeyword('beste noise cancelling koptelefoon')).toBe('Koptelefoon')
    expect(inferCategoryTitleFromKeyword('Ninja airfryer aanbieding')).toBe('Airfryer')
  })
})

describe('findMatchingCategory', () => {
  it('matches plural category names to existing categories', () => {
    expect(findMatchingCategory('Robotstofzuigers', categories)?.slug).toBe('robotstofzuiger')
  })

  it('uses keyword hints when category name is generic', () => {
    expect(
      findMatchingCategory('Audio', categories, 'beste noise cancelling koptelefoon')?.slug,
    ).toBe('koptelefoon')
  })

  it('returns null when no match exists', () => {
    expect(findMatchingCategory('Onbekend', categories)).toBeNull()
  })
})

describe('categorySlugForCreate', () => {
  it('avoids slug collisions', () => {
    expect(categorySlugForCreate('Robotstofzuiger', categories)).toBe('robotstofzuiger-2')
  })
})
