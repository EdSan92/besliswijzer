import { describe, expect, it, vi } from 'vitest'
import {
  assembleProductPageBlocks,
  ProductPageContentAgent,
} from './product-page-content.agent.js'
import type { ProductPageContent } from '../models/product-page-content.js'

const flowId = 'd9e3babb-90d1-4f4b-9c7d-1969cc15ce0b'

const sampleContent: ProductPageContent = {
  pageTitle: 'Welke robotmaaier past bij jou?',
  pageSlug: 'robotmaaier-kiezen',
  seo: {
    title: 'Robotmaaier kiezen in 2026',
    description: 'Beantwoord een paar vragen en ontdek welke robotmaaier het beste bij jouw tuin past.',
  },
  hero: {
    headline: 'Welke robotmaaier past bij jouw tuin?',
    subheadline: 'Beantwoord een paar vragen en krijg direct persoonlijk advies.',
    badges: ['Gratis', '2 minuten', 'Onafhankelijk'],
  },
  intro: {
    title: 'Robotmaaier kiezen?',
    body: 'Een robotmaaier bespaart tijd — maar niet elk model past bij elke tuin.',
  },
  faqItems: [
    {
      question: 'Hoe groot mag mijn tuin zijn?',
      answer: 'Dat hangt af van het model. Compacte robotmaaiers zijn geschikt voor tot circa 300 m².',
    },
    {
      question: 'Werkt een robotmaaier op een hellend gazon?',
      answer: 'Ja, mits je een model kiest met voldoende klimvermogen.',
    },
  ],
}

describe('assembleProductPageBlocks', () => {
  it('builds hero, intro, flow and faq blocks in order', () => {
    const page = assembleProductPageBlocks({
      content: sampleContent,
      flowId,
      flowSlug: 'robotmaaiers',
    })

    expect(page.pageSlug).toBe('robotmaaier-kiezen')
    expect(page.blockOrder).toEqual(['blk_hero', 'blk_intro', 'blk_flow', 'blk_faq'])
    expect(page.blocks).toHaveLength(4)
    expect(page.blocks[0]?.type).toBe('hero')
    expect(page.blocks[1]?.type).toBe('intro')
    expect(page.blocks[2]?.type).toBe('flow')
    expect(page.blocks[3]?.type).toBe('faq')

    const flowBlock = page.blocks[2]
    if (flowBlock?.type === 'flow') {
      expect(flowBlock.data.flowId).toBe(flowId)
      expect(flowBlock.data.flowSlug).toBe('robotmaaiers')
    }

    const faqBlock = page.blocks[3]
    if (faqBlock?.type === 'faq') {
      expect(faqBlock.data.items).toHaveLength(2)
      expect(faqBlock.data.items[0]?.source).toBe('ai')
    }
  })
})

describe('ProductPageContentAgent', () => {
  it('generates content and saves via API client', async () => {
    const aiProvider = {
      generateObject: vi.fn().mockResolvedValue({ data: sampleContent }),
    }
    const promptBuilder = {
      generateProductPage: vi.fn().mockReturnValue('prompt'),
    }
    const besliswijzer = {
      createProductPage: vi.fn().mockResolvedValue({
        productId: 'prod-1',
        pageId: 'page-1',
        pageSlug: 'robotmaaier-kiezen',
        status: 'draft',
      }),
      syncProductKeywords: vi.fn().mockResolvedValue({ synced: 2 }),
    }

    const agent = new ProductPageContentAgent(
      aiProvider as never,
      promptBuilder as never,
      besliswijzer as never,
    )

    const result = await agent.generateAndSave({
      productSlug: 'robotmaaier',
      productTitle: 'Robotmaaier',
      canonicalName: 'robotmaaier',
      categoryTitle: 'Tuin',
      flowId,
      flowSlug: 'robotmaaiers',
      flowTitle: 'Robotmaaier kiezen',
      contentKeywords: [{ term: 'robotmaaier', opportunityId: 'opp-1', score: 80 }],
      publish: false,
    })

    expect(aiProvider.generateObject).toHaveBeenCalledOnce()
    expect(besliswijzer.createProductPage).toHaveBeenCalledOnce()
    expect(besliswijzer.syncProductKeywords).toHaveBeenCalledOnce()
    expect(result.pageSlug).toBe('robotmaaier-kiezen')
    expect(result.generated.blocks).toHaveLength(4)
  })

  it('regenerates content and updates via API client', async () => {
    const aiProvider = {
      generateObject: vi.fn().mockResolvedValue({ data: sampleContent }),
    }
    const promptBuilder = {
      generateProductPage: vi.fn().mockReturnValue('prompt'),
    }
    const besliswijzer = {
      updateProductPage: vi.fn().mockResolvedValue({
        productId: 'prod-1',
        pageId: 'page-1',
        pageSlug: 'robotmaaier-kiezen',
        status: 'published',
      }),
      syncProductKeywords: vi.fn().mockResolvedValue({ synced: 2 }),
    }

    const agent = new ProductPageContentAgent(
      aiProvider as never,
      promptBuilder as never,
      besliswijzer as never,
    )

    const result = await agent.regenerateAndSave({
      productSlug: 'robotmaaier',
      productTitle: 'Robotmaaier',
      canonicalName: 'robotmaaier',
      categoryTitle: 'Tuin',
      flowId,
      flowSlug: 'robotmaaiers',
      flowTitle: 'Robotmaaier kiezen',
      pageSlug: 'robotmaaier-kiezen',
      contentKeywords: [{ term: 'robotmaaier', opportunityId: 'opp-1', score: 80 }],
      seedKeywords: ['robotmaaier'],
      publish: false,
    })

    expect(besliswijzer.updateProductPage).toHaveBeenCalledOnce()
    expect(besliswijzer.syncProductKeywords).toHaveBeenCalledOnce()
    expect(result.pageSlug).toBe('robotmaaier-kiezen')
    expect(result.status).toBe('published')
  })

  it('accepts Gemini responses with too many FAQ items', async () => {
    const oversizedContent = {
      ...sampleContent,
      faqItems: Array.from({ length: 10 }, (_, index) => ({
        question: `Vraag ${index + 1} over robotmaaiers?`,
        answer:
          'Dit antwoord legt uit wat je moet weten en verwijst naar de keuzehulp voor persoonlijk advies.',
      })),
    }

    const aiProvider = {
      generateObject: vi.fn(async (schema, _prompt) => {
        const parsed = schema.parse(oversizedContent)
        return { data: parsed, metrics: { model: 'test', latencyMs: 1, retryCount: 0 } }
      }),
    }
    const promptBuilder = {
      generateProductPage: vi.fn().mockReturnValue('prompt'),
    }
    const besliswijzer = {
      updateProductPage: vi.fn().mockResolvedValue({
        productId: 'prod-1',
        pageId: 'page-1',
        pageSlug: 'robotmaaier-kiezen',
        status: 'published',
      }),
      syncProductKeywords: vi.fn().mockResolvedValue({ synced: 2 }),
    }

    const agent = new ProductPageContentAgent(
      aiProvider as never,
      promptBuilder as never,
      besliswijzer as never,
    )

    const result = await agent.regenerateAndSave({
      productSlug: 'robotmaaier',
      productTitle: 'Robotmaaier',
      canonicalName: 'robotmaaier',
      categoryTitle: 'Tuin',
      flowId,
      flowSlug: 'robotmaaiers',
      flowTitle: 'Robotmaaier kiezen',
      pageSlug: 'robotmaaier-kiezen',
      contentKeywords: [{ term: 'robotmaaier', opportunityId: 'opp-1', score: 80 }],
      publish: false,
    })

    expect(result.generated.blocks.find((block) => block.type === 'faq')).toMatchObject({
      type: 'faq',
    })
    const faqBlock = result.generated.blocks.find((block) => block.type === 'faq')
    if (faqBlock?.type === 'faq') {
      expect(faqBlock.data.items.length).toBeLessThanOrEqual(8)
    }
  })
})
