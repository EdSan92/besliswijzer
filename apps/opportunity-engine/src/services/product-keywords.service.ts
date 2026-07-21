import type { BesliswijzerApiClient } from '../clients/besliswijzer-api.client.js'
import type { OpportunityRepository } from '../repositories/opportunity.repository.js'

export type ProductContentKeyword = {
  term: string
  opportunityId: string
  score: number
  categoryName: string
}

export class ProductKeywordsService {
  constructor(
    private readonly opportunityRepo: OpportunityRepository,
    private readonly besliswijzer: BesliswijzerApiClient,
  ) {}

  async listForProduct(productSlug: string): Promise<ProductContentKeyword[]> {
    const opportunities = await this.opportunityRepo.findMany({ limit: 500, offset: 0 })
    const keywords: ProductContentKeyword[] = []

    for (const opportunity of opportunities) {
      const match = await this.besliswijzer.matchProduct(
        opportunity.keywordTerm,
        opportunity.categoryName,
      )
      if (match?.productSlug !== productSlug) continue

      keywords.push({
        term: opportunity.keywordTerm,
        opportunityId: opportunity.id,
        score: opportunity.score,
        categoryName: opportunity.categoryName,
      })
    }

    return keywords.sort((a, b) => b.score - a.score || a.term.localeCompare(b.term, 'nl'))
  }
}
