import { describe, expect, it, vi } from 'vitest'
import { sortContentBlocks } from '@besliswijzer/product-schema'
import { buildFlowToProductPageSlugMap, validateProductPageForPublish } from './product-page-service.js'
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

describe('buildFlowToProductPageSlugMap', () => {
  it('maps robotmaaiers to the published robot product page', async () => {
    const db = {
      query: {
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              slug: 'robotmaaier',
              canonicalName: 'robotmaaier',
              primaryFlow: { slug: 'robotmaaiers' },
              pages: [{ slug: 'robotmaaier-kiezen', status: 'published' }],
            },
          ]),
        },
        productPages: {
          findMany: vi.fn().mockResolvedValue([
            {
              slug: 'robotmaaier-kiezen',
              blocks: [
                {
                  type: 'flow',
                  data: { flowSlug: 'robotmaaiers' },
                },
              ],
            },
          ]),
        },
        flows: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'flow-1', slug: 'robotmaaiers', title: 'Robotmaaier keuzehulp' },
          ]),
        },
      },
    }

    const map = await buildFlowToProductPageSlugMap(db as never)
    expect(map.robotmaaiers).toBe('robotmaaier-kiezen')
  })
})