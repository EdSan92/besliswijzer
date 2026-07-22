import type { AIProvider } from '../providers/ai/ai-provider.interface.js'
import type { BesliswijzerApiClient } from '../clients/besliswijzer-api.client.js'
import { logger } from '../utils/logger.js'
import type { OpportunityService } from './opportunity.service.js'
import type { PromptBuilder } from './prompt-builder.service.js'

export type RouteOpportunityResult = {
  routed: boolean
  pageSlug?: string
  skippedReason?: string
}

export type RouteBatchResult = {
  routed: number
  skipped: number
  errors: string[]
}

function buildFallbackFaq(keywordTerm: string): { question: string; answer: string } {
  const question = keywordTerm.trim().endsWith('?')
    ? keywordTerm.trim()
    : `${keywordTerm.charAt(0).toUpperCase()}${keywordTerm.slice(1)}?`

  return {
    question,
    answer: `Dit is een veelgezochte vraag over ${keywordTerm}. Gebruik de keuzehulp op deze pagina voor persoonlijk advies op maat.`,
  }
}

export class ProductRouterService {
  constructor(
    private readonly besliswijzer: BesliswijzerApiClient,
    private readonly opportunityService: OpportunityService,
  ) {}

  async routeOpportunity(
    id: string,
    aiProvider: AIProvider,
    promptBuilder: PromptBuilder,
  ): Promise<RouteOpportunityResult> {
    const opportunity = await this.opportunityService.getById(id)
    if (!opportunity) throw new Error('Opportunity not found')

    if (opportunity.status === 'ROUTED_TO_PRODUCT') {
      return { routed: false, skippedReason: 'already routed' }
    }

    const match = await this.besliswijzer.matchProduct(
      opportunity.keywordTerm,
      opportunity.categoryName,
    )

    if (!match) {
      return { routed: false, skippedReason: 'no product match' }
    }

    if (!match.pageSlug) {
      return {
        routed: false,
        skippedReason: `product "${match.productTitle}" has no published page`,
      }
    }

    let faqItem: { question: string; answer: string }
    try {
      const withFaq = await this.opportunityService.generateFaqItem(id, aiProvider, promptBuilder)
      const stored = withFaq.faqItem as { question?: string; answer?: string } | null
      if (stored?.question && stored?.answer) {
        faqItem = { question: stored.question, answer: stored.answer }
      } else {
        faqItem = buildFallbackFaq(opportunity.keywordTerm)
      }
    } catch (error) {
      logger.warn({ opportunityId: id, error }, 'FAQ generation failed, using fallback')
      faqItem = buildFallbackFaq(opportunity.keywordTerm)
    }

    await this.besliswijzer.appendFaqItem(match.pageSlug, {
      opportunityId: id,
      keywordTerm: opportunity.keywordTerm,
      question: faqItem.question,
      answer: faqItem.answer,
    })

    await this.opportunityService.markRoutedToProduct(id, faqItem, match.pageSlug)

    logger.info(
      { opportunityId: id, pageSlug: match.pageSlug, confidence: match.confidence },
      'Opportunity routed to product page',
    )

    return { routed: true, pageSlug: match.pageSlug }
  }

  async routeBatch(
    ids: string[],
    aiProvider: AIProvider,
    promptBuilder: PromptBuilder,
  ): Promise<RouteBatchResult> {
    const errors: string[] = []
    let routed = 0
    let skipped = 0

    for (const id of ids) {
      try {
        const result = await this.routeOpportunity(id, aiProvider, promptBuilder)
        if (result.routed) {
          routed++
        } else {
          skipped++
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${id}: ${message}`)
        logger.error({ opportunityId: id, error }, 'Route to product page failed')
      }
    }

    return { routed, skipped, errors }
  }
}
