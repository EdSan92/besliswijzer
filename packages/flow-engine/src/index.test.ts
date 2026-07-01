import { describe, expect, it } from 'vitest'
import type { FlowSnapshot } from '@besliswijzer/flow-schema'
import { getEntryNode, resolveNext, calculateProgress } from './index.js'

const baseSnapshot: FlowSnapshot = {
  flowId: '00000000-0000-0000-0000-000000000001',
  versionId: '00000000-0000-0000-0000-000000000002',
  versionNumber: 1,
  slug: 'warmtepomp-keuzehulp',
  title: 'Warmtepomp keuzehulp',
  seo: { title: 'Warmtepomp keuzehulp', description: 'Test' },
  nodes: [
    {
      nodeKey: 'woningtype',
      type: 'question',
      title: 'Wat voor woning heb je?',
      content: { inputType: 'single' },
      sortOrder: 0,
      isEntry: true,
      options: [
        { optionKey: 'apartment', label: 'Appartement', value: 'apartment', sortOrder: 0 },
        { optionKey: 'house', label: 'Rijtjeshuis / vrijstaand', value: 'house', sortOrder: 1 },
      ],
    },
    {
      nodeKey: 'isolatie',
      type: 'question',
      title: 'Hoe goed is je isolatie?',
      content: { inputType: 'single' },
      sortOrder: 1,
      isEntry: false,
      options: [
        { optionKey: 'good', label: 'Goed', value: 'good', sortOrder: 0 },
        { optionKey: 'poor', label: 'Matig', value: 'poor', sortOrder: 1 },
      ],
    },
    {
      nodeKey: 'oppervlakte',
      type: 'question',
      title: 'Wat is je woonoppervlakte (m²)?',
      content: { inputType: 'slider', min: 40, max: 300 },
      sortOrder: 2,
      isEntry: false,
      options: [],
    },
  ],
  rules: [
    {
      fromNodeKey: 'woningtype',
      ruleType: 'branch',
      condition: { '==': [{ var: 'answers.woningtype' }, 'apartment'] },
      targetNodeKey: 'isolatie',
      priority: 10,
    },
    {
      fromNodeKey: 'woningtype',
      ruleType: 'branch',
      condition: { '==': [{ var: 'answers.woningtype' }, 'house'] },
      targetNodeKey: 'oppervlakte',
      priority: 10,
    },
    {
      fromNodeKey: '*',
      ruleType: 'result_map',
      condition: {
        and: [
          { '==': [{ var: 'answers.woningtype' }, 'apartment'] },
          { '==': [{ var: 'answers.isolatie' }, 'good'] },
        ],
      },
      targetResultKey: 'advies_klein',
      priority: 100,
    },
    {
      fromNodeKey: '*',
      ruleType: 'result_map',
      condition: {
        and: [
          { '==': [{ var: 'answers.woningtype' }, 'house'] },
          { '>=': [{ var: 'answers.oppervlakte' }, 120] },
        ],
      },
      targetResultKey: 'advies_groot',
      priority: 100,
    },
  ],
  results: [
    {
      resultKey: 'advies_klein',
      title: 'All-electric warmtepomp geschikt',
      body: { summary: 'Voor jouw appartement met goede isolatie is een all-electric warmtepomp een goede keuze.' },
      ctas: [{ id: 'cta1', type: 'affiliate', url: 'https://example.com/warmtepomp', label: 'Bekijk warmtepompen' }],
    },
    {
      resultKey: 'advies_groot',
      title: 'Hybride warmtepomp aanbevolen',
      body: { summary: 'Voor grotere woningen raden we een hybride warmtepomp aan.' },
      ctas: [{ id: 'cta2', type: 'affiliate', url: 'https://example.com/hybride', label: 'Vergelijk hybride pompen' }],
    },
  ],
}

describe('flow-engine', () => {
  it('returns entry node', () => {
    const entry = getEntryNode(baseSnapshot)
    expect(entry?.nodeKey).toBe('woningtype')
  })

  it('branches to isolatie for apartment', () => {
    const next = resolveNext(baseSnapshot, { woningtype: 'apartment' }, 'woningtype')
    expect(next.type).toBe('node')
    if (next.type === 'node') {
      expect(next.nodeKey).toBe('isolatie')
    }
  })

  it('branches to oppervlakte for house', () => {
    const next = resolveNext(baseSnapshot, { woningtype: 'house' }, 'woningtype')
    expect(next.type).toBe('node')
    if (next.type === 'node') {
      expect(next.nodeKey).toBe('oppervlakte')
    }
  })

  it('resolves result for apartment with good isolation', () => {
    const next = resolveNext(
      baseSnapshot,
      { woningtype: 'apartment', isolatie: 'good' },
      'isolatie',
    )
    expect(next.type).toBe('result')
    if (next.type === 'result') {
      expect(next.resultKey).toBe('advies_klein')
    }
  })

  it('calculates progress', () => {
    expect(calculateProgress(baseSnapshot, ['woningtype'])).toBe(33)
    expect(calculateProgress(baseSnapshot, ['woningtype', 'isolatie'])).toBe(67)
  })
})
