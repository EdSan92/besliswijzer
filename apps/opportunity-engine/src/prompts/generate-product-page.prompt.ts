import {
  PRODUCT_PAGE_FAQ_MAX,
  resolveProductPageFaqCount,
} from '../models/product-page-content.js'

export type ContentKeywordInput = {
  term: string
  opportunityId?: string
  score?: number
  categoryName?: string
}

export type ProductPagePromptInput = {
  productTitle: string
  canonicalName: string
  category: string
  flowTitle: string
  seedKeywords?: string[]
  contentKeywords?: ContentKeywordInput[]
}

function resolveContentKeywords(input: ProductPagePromptInput): ContentKeywordInput[] {
  if (input.contentKeywords && input.contentKeywords.length > 0) {
    return input.contentKeywords
  }

  return (input.seedKeywords ?? []).map((term) => ({ term }))
}

function formatFaqInstruction(keywordCount: number): string {
  const { min, max } = resolveProductPageFaqCount(keywordCount)

  if (min === max) {
    return `precies ${min} veelgestelde vragen (maximaal ${PRODUCT_PAGE_FAQ_MAX} toegestaan)`
  }

  return `${min}-${max} veelgestelde vragen (maximaal ${PRODUCT_PAGE_FAQ_MAX}, nooit meer)`
}

function formatKeywordSection(keywords: ContentKeywordInput[]): string {
  if (keywords.length === 0) return ''

  const lines = keywords.map((keyword) => {
    const score =
      keyword.score !== undefined ? ` — opportunity score ${Math.round(keyword.score)}` : ''
    return `- "${keyword.term}"${score}`
  })

  const faqKeywordRule =
    keywords.length > PRODUCT_PAGE_FAQ_MAX
      ? `- FAQ: kies de ${PRODUCT_PAGE_FAQ_MAX} belangrijkste keywords (hoogste scores) — één vraag per keyword`
      : '- FAQ: schrijf minimaal één FAQ-vraag per keyword, geformuleerd zoals een gebruiker zou zoeken'

  return `
Opportunity-zoekwoorden (keyword research — gebruik als hoofdleidraad voor ALLE content):
${lines.join('\n')}

Keyword-instructies (verplicht):
- SEO title & description: verwerk de belangrijkste zoekintenties uit bovenstaande keywords natuurlijk
${faqKeywordRule}
- Hero & intro: adresseeer de gemeenschappelijke koopintentie achter deze keywords
- Antwoorden: informatief, onafhankelijk, 2-4 zinnen per FAQ
- Geen keyword stuffing — schrijf voor mensen, niet voor robots`
}

export function buildGenerateProductPagePrompt(input: ProductPagePromptInput): string {
  const keywords = resolveContentKeywords(input)
  const keywordSection = formatKeywordSection(keywords)
  const faqInstruction = formatFaqInstruction(keywords.length)

  return `Je bent een SEO-copywriter voor productkeuzehulpen (Nederlandse markt).

Schrijf de content voor een productpagina met een ingebouwde keuzehulp.

Product: ${input.productTitle}
Canonical name: ${input.canonicalName}
Categorie: ${input.category}
Keuzehulp: ${input.flowTitle}${keywordSection}

Regels:
- Hero: pakkende headline + subheadline die de keuzehulp benadrukt
- Intro: 2-3 zinnen, informatief en onafhankelijk
- SEO: title max 60 tekens, description max 155 tekens — gebaseerd op opportunity keywords
- FAQ: ${faqInstruction} met korte, nuttige antwoorden
- Badges: 2-3 korte USP's (bijv. "Gratis", "2 minuten", "Onafhankelijk")
- pageSlug: kebab-case, beschrijvend (bijv. "robotmaaier-kiezen")
- Nederlands, geen hype of superlatieven

Antwoord ALLEEN als JSON:
{
  "pageTitle": string,
  "pageSlug": string,
  "seo": { "title": string, "description": string },
  "hero": { "headline": string, "subheadline": string, "badges": string[] },
  "intro": { "title": string, "body": string },
  "faqItems": [{ "question": string, "answer": string }]
}`
}
