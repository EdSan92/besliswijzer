import { describe, expect, it } from 'vitest'
import {
  normalizeProductPageContentRaw,
  PRODUCT_PAGE_FAQ_MAX,
  productPageContentSchema,
  resolveProductPageFaqCount,
} from './product-page-content.js'

const validFaqItem = (index: number) => ({
  question: `Vraag ${index} over robotstofzuigers?`,
  answer:
    'Dit antwoord legt kort uit wat je moet weten en verwijst naar de keuzehulp voor persoonlijk advies.',
})

const baseContent = {
  pageTitle: 'Robotstofzuiger kiezen',
  pageSlug: 'robotstofzuiger-kiezen',
  seo: {
    title: 'Robotstofzuiger kiezen',
    description: 'Vind de beste robotstofzuiger voor jouw huis met onze keuzehulp.',
  },
  hero: {
    headline: 'Welke robotstofzuiger past bij jou?',
    subheadline: 'Beantwoord een paar vragen.',
    badges: ['Gratis'],
  },
  intro: {
    title: 'Robotstofzuiger kiezen',
    body: 'Een robotstofzuiger bespaart tijd. Onze keuzehulp helpt je kiezen.',
  },
}

describe('resolveProductPageFaqCount', () => {
  it('caps FAQ count at PRODUCT_PAGE_FAQ_MAX for many keywords', () => {
    expect(resolveProductPageFaqCount(9)).toEqual({ min: 8, max: 8 })
    expect(resolveProductPageFaqCount(12)).toEqual({ min: 8, max: 8 })
  })

  it('scales FAQ count for small keyword sets', () => {
    expect(resolveProductPageFaqCount(3)).toEqual({ min: 4, max: 6 })
    expect(resolveProductPageFaqCount(6)).toEqual({ min: 6, max: 8 })
  })
})

describe('normalizeProductPageContentRaw', () => {
  it('truncates FAQ items beyond the schema maximum', () => {
    const raw = {
      ...baseContent,
      faqItems: Array.from({ length: 10 }, (_, index) => validFaqItem(index + 1)),
    }

    const normalized = normalizeProductPageContentRaw(raw) as typeof raw
    expect(normalized.faqItems).toHaveLength(PRODUCT_PAGE_FAQ_MAX)
  })
})

describe('productPageContentSchema', () => {
  it('accepts Gemini responses with too many FAQ items after normalization', () => {
    const parsed = productPageContentSchema.parse({
      ...baseContent,
      faqItems: Array.from({ length: 10 }, (_, index) => validFaqItem(index + 1)),
    })

    expect(parsed.faqItems).toHaveLength(PRODUCT_PAGE_FAQ_MAX)
  })

  it('rejects responses with too few FAQ items', () => {
    expect(() =>
      productPageContentSchema.parse({
        ...baseContent,
        faqItems: [validFaqItem(1)],
      }),
    ).toThrow()
  })
})
