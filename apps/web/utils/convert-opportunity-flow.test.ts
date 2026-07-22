import { describe, expect, it } from 'vitest'
import { convertOpportunityFlowToBesliswijzer } from './convert-opportunity-flow'

const sampleFlow = {
  title: 'Airfryer keuzehulp',
  slug: 'Airfryer Keuzehulp!',
  description: 'Vind de beste airfryer',
  seoTitle: 'Beste airfryer',
  seoDescription: 'Korte keuzehulp',
  nodes: [
    {
      nodeKey: 'budget',
      type: 'question_single' as const,
      title: 'Budget?',
      isEntry: true,
      options: [
        { value: 'laag', label: 'Tot €100' },
        { value: 'hoog', label: 'Meer dan €100' },
      ],
    },
    {
      nodeKey: 'gebruik',
      type: 'question_single' as const,
      title: 'Gebruik?',
      options: [{ value: 'klein', label: '1-2 personen' }],
    },
  ],
  rules: [
    {
      fromNodeKey: 'budget',
      targetNodeKey: 'gebruik',
      condition: { value: 'laag' },
    },
    {
      fromNodeKey: 'gebruik',
      targetResultKey: 'pick',
      condition: { budget: 'laag', gebruik: 'klein' },
    },
  ],
  results: [
    {
      resultKey: 'pick',
      title: 'Budget airfryer',
      body: 'Onze topkeuze',
      ctaUrl: 'https://www.bol.com/airfryer',
      ctaLabel: 'Bekijk bij Bol',
    },
  ],
}

describe('convertOpportunityFlowToBesliswijzer', () => {
  it('maps nodes, rules, results and seo', () => {
    const converted = convertOpportunityFlowToBesliswijzer(sampleFlow)

    expect(converted.slug).toBe('airfryer-keuzehulp')
    expect(converted.nodes[0].type).toBe('question')
    expect(converted.nodes[0].content.inputType).toBe('single')
    expect(converted.nodes[0].options[0].optionKey).toBe('laag')
    expect(converted.rules[0].ruleType).toBe('branch')
    expect(converted.rules[0].condition).toEqual({
      '==': [{ var: 'answers.budget' }, 'laag'],
    })
    expect(converted.rules[1].ruleType).toBe('result_map')
    expect(converted.results[0].body.summary).toBe('Onze topkeuze')
    expect(converted.results[0].ctas[0].url).toBe('https://www.bol.com/airfryer')
  })

  it('strips trailing numbers from slug', () => {
    const converted = convertOpportunityFlowToBesliswijzer({
      ...sampleFlow,
      slug: 'ninja-airfryer-keuzehulp500',
    })
    expect(converted.slug).toBe('ninja-airfryer-keuzehulp')
  })
})
