import { describe, expect, it } from 'vitest'
import { updateArtifactBodySchema } from '@besliswijzer/pipeline-review'
import { validateArtifactCorrectionPayload } from '@besliswijzer/pipeline-review'

describe('pipeline-admin artifact PATCH contract', () => {
  it('rejects unsupported artifact kinds', () => {
    const parsed = updateArtifactBodySchema.safeParse({
      kind: 'quality_report',
      payload: {},
      actor: 'admin',
    })

    expect(parsed.success).toBe(false)
  })

  it('requires actor and payload for supported kinds', () => {
    const parsed = updateArtifactBodySchema.safeParse({
      kind: 'flow_brief',
      payload: { brief: { slug: 'airfryers' } },
      actor: 'admin',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects invalid flow_brief correction payloads', () => {
    const result = validateArtifactCorrectionPayload('flow_brief', { brief: { slug: 'x' } })
    expect(result.ok).toBe(false)
  })

  it('accepts valid content_package correction payloads', () => {
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
