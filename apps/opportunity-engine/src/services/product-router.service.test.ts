import { describe, expect, it, vi } from 'vitest'
import type { Opportunity } from '@prisma/client'
import { ProductRouterService } from './product-router.service.js'

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-1',
    keywordTerm: 'robotmaaier gps',
    categoryName: 'Tuin',
    score: 85,
    reasons: ['Hoge koopintentie'],
    estimatedCommission: 25,
    confidence: 0.9,
    status: 'NEW',
    flowDefinition: null,
    faqItem: null,
    routedPageSlug: null,
    keywordId: 'kw-1',
    categoryId: 'cat-1',
    rejectedReason: null,
    discoveredAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Opportunity
}

describe('ProductRouterService', () => {
  it('routes opportunity when product page match exists', async () => {
    const besliswijzer = {
      matchProduct: vi.fn().mockResolvedValue({
        productId: 'prod-1',
        productSlug: 'robotmaaier',
        productTitle: 'Robotmaaier',
        canonicalName: 'robotmaaier',
        pageSlug: 'robotmaaier-kiezen',
        categorySlug: 'tuin',
        confidence: 0.82,
        matchReason: 'canonical name overlap',
      }),
      appendFaqItem: vi.fn().mockResolvedValue({
        pageSlug: 'robotmaaier-kiezen',
        faqItemId: 'faq_opp_opp-1',
        created: true,
      }),
    }

    const opportunityService = {
      getById: vi.fn().mockResolvedValue(makeOpportunity()),
      generateFaqItem: vi.fn().mockResolvedValue(
        makeOpportunity({
          faqItem: {
            question: 'Welke robotmaaier met GPS?',
            answer: 'Kies op basis van tuinoppervlakte en budget via de keuzehulp.',
          },
        }),
      ),
      markRoutedToProduct: vi.fn().mockResolvedValue(
        makeOpportunity({ status: 'ROUTED_TO_PRODUCT', routedPageSlug: 'robotmaaier-kiezen' }),
      ),
    }

    const service = new ProductRouterService(besliswijzer as never, opportunityService as never)

    const result = await service.routeOpportunity('opp-1', {} as never, {} as never)

    expect(result).toEqual({ routed: true, pageSlug: 'robotmaaier-kiezen' })
    expect(besliswijzer.appendFaqItem).toHaveBeenCalledWith('robotmaaier-kiezen', {
      opportunityId: 'opp-1',
      keywordTerm: 'robotmaaier gps',
      question: 'Welke robotmaaier met GPS?',
      answer: 'Kies op basis van tuinoppervlakte en budget via de keuzehulp.',
    })
    expect(opportunityService.markRoutedToProduct).toHaveBeenCalled()
  })

  it('skips when no product match is found', async () => {
    const besliswijzer = {
      matchProduct: vi.fn().mockResolvedValue(null),
      appendFaqItem: vi.fn(),
    }
    const opportunityService = {
      getById: vi.fn().mockResolvedValue(makeOpportunity()),
      generateFaqItem: vi.fn(),
      markRoutedToProduct: vi.fn(),
    }

    const service = new ProductRouterService(besliswijzer as never, opportunityService as never)
    const result = await service.routeOpportunity('opp-1', {} as never, {} as never)

    expect(result).toEqual({ routed: false, skippedReason: 'no product match' })
    expect(besliswijzer.appendFaqItem).not.toHaveBeenCalled()
  })

  it('aggregates batch routed and skipped counts', async () => {
    const besliswijzer = {
      matchProduct: vi
        .fn()
        .mockResolvedValueOnce({
          productId: 'prod-1',
          productSlug: 'robotmaaier',
          productTitle: 'Robotmaaier',
          canonicalName: 'robotmaaier',
          pageSlug: 'robotmaaier-kiezen',
          categorySlug: 'tuin',
          confidence: 0.82,
          matchReason: 'match',
        })
        .mockResolvedValueOnce(null),
      appendFaqItem: vi.fn().mockResolvedValue({ pageSlug: 'robotmaaier-kiezen', created: true }),
    }

    const opportunityService = {
      getById: vi
        .fn()
        .mockResolvedValueOnce(makeOpportunity({ id: 'opp-1' }))
        .mockResolvedValueOnce(makeOpportunity({ id: 'opp-2', keywordTerm: 'onbekend product xyz' })),
      generateFaqItem: vi.fn().mockResolvedValue(
        makeOpportunity({
          faqItem: { question: 'Vraag?', answer: 'Antwoord met voldoende lengte voor validatie.' },
        }),
      ),
      markRoutedToProduct: vi.fn().mockResolvedValue(makeOpportunity({ status: 'ROUTED_TO_PRODUCT' })),
    }

    const service = new ProductRouterService(besliswijzer as never, opportunityService as never)
    const result = await service.routeBatch(['opp-1', 'opp-2'], {} as never, {} as never)

    expect(result.routed).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.errors).toHaveLength(0)
  })
})
