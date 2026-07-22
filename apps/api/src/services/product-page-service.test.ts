import { describe, expect, it } from 'vitest'
import { sortContentBlocks } from '@besliswijzer/product-schema'
import { validateProductPageForPublish } from './product-page-service.js'
describe('product page blocks', () => {
  it('orders blocks by layout blockOrder', () => {
    const blocks = [
      {
        id: 'b',
        type: 'faq' as const,
        sortOrder: 1,
        visible: true,
        source: 'manual' as const,
        data: { items: [{ id: '1', question: 'Q', answer: 'A' }] },
      },
      {
        id: 'a',
        type: 'hero' as const,
        sortOrder: 0,
        visible: true,
        source: 'manual' as const,
        data: { headline: 'H' },
      },
    ]

    const sorted = sortContentBlocks(blocks, ['a', 'b'])
    expect(sorted.map((b) => b.id)).toEqual(['a', 'b'])
  })
})

describe('validateProductPageForPublish', () => {
  it('rejects pages without blocks', () => {
    const errors = validateProductPageForPublish({
      blocks: [],
      seoMeta: { title: 'T', description: 'D' },
    })
    expect(errors).toContain('Pagina heeft geen contentblokken')
  })

  it('accepts valid hero block and seo', () => {
    const errors = validateProductPageForPublish({
      blocks: [
        {
          id: 'hero',
          type: 'hero',
          sortOrder: 0,
          visible: true,
          source: 'manual',
          data: { headline: 'Test' },
        },
      ],
      seoMeta: { title: 'SEO titel', description: 'SEO beschrijving' },
    })
    expect(errors).toEqual([])
  })
})