import { describe, expect, it } from 'vitest'
import { buildGenerateProductPagePrompt } from './generate-product-page.prompt.js'
import { PRODUCT_PAGE_FAQ_MAX } from '../models/product-page-content.js'

describe('buildGenerateProductPagePrompt', () => {
  it('includes opportunity keywords with FAQ instructions', () => {
    const prompt = buildGenerateProductPagePrompt({
      productTitle: 'Robotstofzuiger',
      canonicalName: 'robotstofzuiger',
      category: 'Huishouden',
      flowTitle: 'Robotstofzuiger kiezen',
      contentKeywords: [
        { term: 'beste robotstofzuiger dierenharen', score: 82 },
        { term: 'robotstofzuiger met zelfleegstation', score: 75 },
      ],
    })

    expect(prompt).toContain('beste robotstofzuiger dierenharen')
    expect(prompt).toContain('robotstofzuiger met zelfleegstation')
    expect(prompt).toContain('minimaal één FAQ-vraag per keyword')
    expect(prompt).toContain('Opportunity-zoekwoorden')
  })

  it('caps FAQ instructions when there are more keywords than the schema allows', () => {
    const keywords = Array.from({ length: 10 }, (_, index) => ({
      term: `robotstofzuiger keyword ${index + 1}`,
      score: 90 - index,
    }))

    const prompt = buildGenerateProductPagePrompt({
      productTitle: 'Robotstofzuiger',
      canonicalName: 'robotstofzuiger',
      category: 'Huishouden',
      flowTitle: 'Robotstofzuiger kiezen',
      contentKeywords: keywords,
    })

    expect(prompt).toContain(`precies ${PRODUCT_PAGE_FAQ_MAX} veelgestelde vragen`)
    expect(prompt).toContain(
      `kies de ${PRODUCT_PAGE_FAQ_MAX} belangrijkste keywords (hoogste scores)`,
    )
    expect(prompt).not.toContain('10 veelgestelde vragen')
  })
})
