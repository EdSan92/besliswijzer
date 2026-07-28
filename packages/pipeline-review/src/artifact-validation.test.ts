import { describe, expect, it } from 'vitest'
import { validateArtifactCorrectionPayload } from './artifact-validation.js'

describe('validateArtifactCorrectionPayload', () => {
  it('rejects invalid content_package payloads', () => {
    const result = validateArtifactCorrectionPayload('content_package', {
      content: { slug: 'a', intro: '', buyingGuide: '', faq: [], metadata: { title: 'x', description: 'y' } },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0)
    }
  })

  it('accepts valid content_package payloads', () => {
    const result = validateArtifactCorrectionPayload('content_package', {
      content: {
        slug: 'airfryers',
        intro: 'Intro met voldoende context voor airfryers.',
        buyingGuide: 'Koopgids met praktische tips over capaciteit en functies.',
        faq: [{ question: 'Wat is een airfryer?', answer: 'Een compact heteluchtapparaat.' }],
        metadata: {
          title: 'Airfryer kopen: keuzehulp voor capaciteit en budget',
          description:
            'Ontdek welke airfryer past bij jouw huishouden met onze praktische koopgids en FAQ.',
        },
      },
      claims: [],
    })

    expect(result.ok).toBe(true)
  })
})
