import {
  deriveProductSlugFromKeyword,
  resolveProductFlowSlug,
  toProductSlug,
  type ProductMatchCandidate,
} from '@besliswijzer/product-schema'
import type { OpportunityItem } from '~/types/opportunity'

export type ProductOpportunityGroup = {
  key: string
  productSlug: string
  productTitle: string
  canonicalName: string
  categoryTitle: string
  pageSlug: string | null
  keywords: string[]
  opportunityIds: string[]
}

export { deriveProductSlugFromKeyword, resolveProductFlowSlug, toProductSlug }

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function groupOpportunitiesByProduct(
  opportunities: OpportunityItem[],
  matches: Record<string, ProductMatchCandidate>,
): ProductOpportunityGroup[] {
  const groups = new Map<string, ProductOpportunityGroup>()

  for (const opportunity of opportunities) {
    const match = matches[opportunity.id]
    const productSlug = match?.productSlug ?? deriveProductSlugFromKeyword(opportunity.keywordTerm)
    const existing = groups.get(productSlug)

    if (existing) {
      if (!existing.keywords.includes(opportunity.keywordTerm)) {
        existing.keywords.push(opportunity.keywordTerm)
      }
      existing.opportunityIds.push(opportunity.id)
      if (match?.pageSlug) existing.pageSlug = match.pageSlug
      if (match?.productTitle) existing.productTitle = match.productTitle
      if (match?.canonicalName) existing.canonicalName = match.canonicalName
      continue
    }

    groups.set(productSlug, {
      key: productSlug,
      productSlug,
      productTitle: match?.productTitle ?? titleCase(productSlug.replace(/-/g, ' ')),
      canonicalName: match?.canonicalName ?? productSlug,
      categoryTitle: opportunity.categoryName,
      pageSlug: match?.pageSlug ?? null,
      keywords: [opportunity.keywordTerm],
      opportunityIds: [opportunity.id],
    })
  }

  return [...groups.values()].sort((a, b) => b.keywords.length - a.keywords.length)
}
