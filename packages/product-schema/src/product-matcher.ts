const NOISE_PATTERN =
  /\b(beste|top|goedkoop|goedkoopste|aanbieding|kopen|vergelijken|review|tests|test|koopgids|keuzehulp|202\d)\b/gi

export function normalizeKeywordTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(NOISE_PATTERN, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeProductTerm(term: string): string[] {
  return normalizeKeywordTerm(term)
    .split(' ')
    .filter((token) => token.length > 2)
}

export interface ProductMatchCandidate {
  productId: string
  productSlug: string
  productTitle: string
  canonicalName: string
  pageSlug: string | null
  categorySlug: string | null
  confidence: number
  matchReason: string
}

export function scoreProductMatch(input: {
  keywordTerm: string
  categoryName?: string
  product: {
    id: string
    slug: string
    title: string
    canonicalName: string
    categorySlug?: string | null
    categoryTitle?: string | null
    keywordTerms?: string[]
    pageSlug?: string | null
  }
}): ProductMatchCandidate | null {
  const normalizedKeyword = normalizeKeywordTerm(input.keywordTerm)
  if (!normalizedKeyword) return null

  const keywordTokens = tokenizeProductTerm(input.keywordTerm)
  const canonicalTokens = tokenizeProductTerm(input.product.canonicalName)
  const slugTokens = tokenizeProductTerm(input.product.slug.replace(/-/g, ' '))

  let score = 0
  const reasons: string[] = []

  if (
    normalizedKeyword.includes(input.product.canonicalName) ||
    input.product.canonicalName.includes(normalizedKeyword)
  ) {
    score += 0.45
    reasons.push('canonical name overlap')
  }

  const tokenOverlap = keywordTokens.filter(
    (token) => canonicalTokens.includes(token) || slugTokens.includes(token),
  ).length

  if (tokenOverlap > 0) {
    score += Math.min(0.4, tokenOverlap * 0.12)
    reasons.push(`${tokenOverlap} shared token(s)`)
  }

  for (const term of input.product.keywordTerms ?? []) {
    if (normalizeKeywordTerm(term) === normalizedKeyword) {
      score += 0.5
      reasons.push('exact keyword registered')
      break
    }
  }

  if (input.categoryName && input.product.categoryTitle) {
    const catNorm = normalizeKeywordTerm(input.categoryName)
    const productCatNorm = normalizeKeywordTerm(input.product.categoryTitle)
    if (catNorm.includes(productCatNorm) || productCatNorm.includes(catNorm)) {
      score += 0.1
      reasons.push('category match')
    }
  }

  if (score < 0.35) return null

  return {
    productId: input.product.id,
    productSlug: input.product.slug,
    productTitle: input.product.title,
    canonicalName: input.product.canonicalName,
    pageSlug: input.product.pageSlug ?? null,
    categorySlug: input.product.categorySlug ?? null,
    confidence: Math.min(1, Number(score.toFixed(2))),
    matchReason: reasons.join(', ') || 'keyword similarity',
  }
}

export function pickBestProductMatch(
  keywordTerm: string,
  categoryName: string | undefined,
  products: Array<{
    id: string
    slug: string
    title: string
    canonicalName: string
    categorySlug?: string | null
    categoryTitle?: string | null
    keywordTerms?: string[]
    pageSlug?: string | null
  }>,
): ProductMatchCandidate | null {
  let best: ProductMatchCandidate | null = null

  for (const product of products) {
    const candidate = scoreProductMatch({ keywordTerm, categoryName, product })
    if (!candidate) continue
    if (!best || candidate.confidence > best.confidence) {
      best = candidate
    }
  }

  return best
}
