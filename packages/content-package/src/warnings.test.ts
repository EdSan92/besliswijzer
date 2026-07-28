import { describe, expect, it } from 'vitest'
import type { ContentPackage } from '@besliswijzer/pipeline-quality'
import { assessContentPackageQuality } from './warnings.js'

const baseContent: ContentPackage = {
  slug: 'airfryers',
  intro: 'Een intro met voldoende context over airfryers en keuzecriteria voor huishoudens.',
  buyingGuide: 'Een koopgids met praktische tips over capaciteit, functies en onderhoud.',
  faq: [
    { question: 'Wat is een airfryer?', answer: 'Een compact apparaat dat met hete lucht geeft.' },
    { question: 'Wat is een airfryer?', answer: 'Dubbele vraag voor test.' },
  ],
  metadata: {
    title: 'Kort',
    description: 'Te kort voor SEO.',
  },
}

describe('assessContentPackageQuality', () => {
  it('flags short metadata, duplicate FAQ and unverified claims', () => {
    const warnings = assessContentPackageQuality(baseContent, [
      { id: 'claim-1', text: 'Beste airfryer ter wereld', requiresSource: true },
    ])
    const codes = warnings.map((warning) => warning.code)

    expect(codes).toContain('CONTENT_METADATA_TITLE_SHORT')
    expect(codes).toContain('CONTENT_METADATA_DESCRIPTION_SHORT')
    expect(codes).toContain('CONTENT_DUPLICATE_FAQ')
    expect(codes).toContain('NEEDS_VERIFICATION')
  })
})
