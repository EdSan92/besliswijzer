import { describe, expect, it } from 'vitest'
import type { FlowBrief } from '@besliswijzer/flow-compiler'
import { assessFlowBriefQuality } from './warnings.js'

const baseBrief: FlowBrief = {
  slug: 'airfryers',
  title: 'Airfryer keuzehulp',
  metadata: {
    targetAudience: 'Huishoudens',
    problem: 'Keuze',
    searchIntent: 'commercial',
    exclusions: [],
    buyingCriteria: ['Budget'],
    requiredProductFields: ['price'],
  },
  questions: [
    {
      questionKey: 'budget',
      title: 'Wat is je budget?',
      inputType: 'single',
      decisionPurpose: 'Segmenteert instap versus premium',
      options: [
        { optionKey: 'laag', label: 'Laag', value: 'laag' },
        { optionKey: 'hoog', label: 'Hoog', value: 'hoog' },
      ],
    },
    {
      questionKey: 'gebruik',
      title: 'Wat is je budget?',
      inputType: 'single',
      decisionPurpose: 'Segmenteert instap versus premium',
      options: [
        { optionKey: 'weinig', label: 'Laag', value: 'weinig' },
        { optionKey: 'veel', label: 'Hoog', value: 'veel' },
      ],
    },
  ],
  decisionRules: [],
  results: [
    {
      resultKey: 'advies',
      title: 'Advies',
      body: { summary: 'Dit is de beste keuze zonder bron.' },
      ctas: [],
    },
  ],
  includeLeadCapture: false,
}

describe('assessFlowBriefQuality', () => {
  it('flags duplicate titles, purposes, overlapping options and unverified claims', () => {
    const warnings = assessFlowBriefQuality(baseBrief)
    const codes = warnings.map((warning) => warning.code)

    expect(codes).toContain('DUPLICATE_QUESTION_TITLE')
    expect(codes).toContain('DUPLICATE_DECISION_PURPOSE')
    expect(codes).toContain('NON_DISCRIMINATING_OPTIONS')
    expect(codes).toContain('UNVERIFIED_PRODUCT_CLAIM')
  })
})
