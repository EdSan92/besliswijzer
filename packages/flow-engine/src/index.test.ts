import { describe, expect, it } from 'vitest'
import type { FlowNode, FlowSnapshot } from '@besliswijzer/flow-schema'
import {
  calculateProgress,
  getAnswerValidationError,
  getEntryNode,
  normalizeAnswer,
  resolveNext,
  validateAnswer,
} from './index.js'

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

const skipSnapshot: FlowSnapshot = {
  ...baseSnapshot,
  nodes: [
    {
      nodeKey: 'start',
      type: 'question',
      title: 'Start',
      content: { inputType: 'single' },
      sortOrder: 0,
      isEntry: true,
      options: [{ optionKey: 'yes', label: 'Ja', value: 'yes', sortOrder: 0 }],
    },
    {
      nodeKey: 'skipped',
      type: 'question',
      title: 'Overgeslagen',
      content: { inputType: 'single' },
      sortOrder: 1,
      isEntry: false,
      options: [{ optionKey: 'a', label: 'A', value: 'a', sortOrder: 0 }],
    },
    {
      nodeKey: 'end',
      type: 'question',
      title: 'Einde',
      content: { inputType: 'single' },
      sortOrder: 2,
      isEntry: false,
      options: [{ optionKey: 'b', label: 'B', value: 'b', sortOrder: 0 }],
    },
  ],
  rules: [
    {
      fromNodeKey: 'start',
      ruleType: 'skip',
      condition: { '==': [{ var: 'answers.start' }, 'yes'] },
      targetNodeKey: 'end',
      priority: 10,
    },
  ],
  results: [],
}

function makeNode(overrides: Partial<FlowNode> & Pick<FlowNode, 'nodeKey' | 'type' | 'title'>): FlowNode {
  return {
    content: {},
    sortOrder: 0,
    isEntry: false,
    options: [],
    ...overrides,
  }
}

describe('flow-engine', () => {
  it('returns entry node', () => {
    const entry = getEntryNode(baseSnapshot)
    expect(entry?.nodeKey).toBe('woningtype')
  })

  it('falls back to first node when no entry is marked', () => {
    const snapshot: FlowSnapshot = {
      ...baseSnapshot,
      nodes: baseSnapshot.nodes.map((node) => ({ ...node, isEntry: false })),
    }
    expect(getEntryNode(snapshot)?.nodeKey).toBe('woningtype')
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

  it('follows skip rules over sequential order', () => {
    const next = resolveNext(skipSnapshot, { start: 'yes' }, 'start')
    expect(next.type).toBe('node')
    if (next.type === 'node') {
      expect(next.nodeKey).toBe('end')
    }
  })

  it('returns complete when no next step exists', () => {
    const snapshot: FlowSnapshot = {
      ...baseSnapshot,
      rules: [],
      results: [],
    }
    const next = resolveNext(snapshot, { woningtype: 'house' }, 'oppervlakte')
    expect(next.type).toBe('complete')
  })

  it('calculates progress', () => {
    expect(calculateProgress(baseSnapshot, ['woningtype'])).toBe(33)
    expect(calculateProgress(baseSnapshot, ['woningtype', 'isolatie'])).toBe(67)
  })

  it('returns 100% progress when there are no question nodes', () => {
    const snapshot: FlowSnapshot = {
      ...baseSnapshot,
      nodes: [{ nodeKey: 'info', type: 'info', title: 'Info', content: {}, sortOrder: 0, isEntry: true, options: [] }],
    }
    expect(calculateProgress(snapshot, [])).toBe(100)
  })
})

describe('validateAnswer', () => {
  it('accepts valid single choice by optionKey', () => {
    const node = makeNode({
      nodeKey: 'q1',
      type: 'question',
      title: 'Q',
      content: { inputType: 'single' },
      options: [{ optionKey: 'a', label: 'A', value: 'alpha', sortOrder: 0 }],
    })
    expect(validateAnswer(node, 'a')).toBe(true)
  })

  it('accepts valid multi choice', () => {
    const node = makeNode({
      nodeKey: 'q2',
      type: 'question',
      title: 'Q',
      content: { inputType: 'multi' },
      options: [
        { optionKey: 'a', label: 'A', value: 'alpha', sortOrder: 0 },
        { optionKey: 'b', label: 'B', value: 'beta', sortOrder: 1 },
      ],
    })
    expect(validateAnswer(node, ['alpha', 'beta'])).toBe(true)
    expect(validateAnswer(node, ['invalid'])).toBe(false)
  })

  it('accepts slider numbers', () => {
    const node = makeNode({
      nodeKey: 'q3',
      type: 'question',
      title: 'Q',
      content: { inputType: 'slider' },
    })
    expect(validateAnswer(node, 120)).toBe(true)
    expect(validateAnswer(node, '120')).toBe(false)
  })

  it('accepts non-empty text', () => {
    const node = makeNode({
      nodeKey: 'q4',
      type: 'question',
      title: 'Q',
      content: { inputType: 'text' },
    })
    expect(validateAnswer(node, '  hallo  ')).toBe(true)
    expect(validateAnswer(node, '   ')).toBe(false)
  })

  it('always accepts info nodes', () => {
    const node = makeNode({ nodeKey: 'info', type: 'info', title: 'Info' })
    expect(validateAnswer(node, undefined)).toBe(true)
  })

  it('accepts empty or valid email for lead capture', () => {
    const node = makeNode({ nodeKey: 'lead', type: 'lead_capture', title: 'E-mail' })
    expect(validateAnswer(node, '')).toBe(true)
    expect(validateAnswer(node, 'user@example.com')).toBe(true)
    expect(validateAnswer(node, 'invalid')).toBe(false)
  })
})

describe('normalizeAnswer', () => {
  it('maps optionKey to value for single choice', () => {
    const node = makeNode({
      nodeKey: 'q1',
      type: 'question',
      title: 'Q',
      content: { inputType: 'single' },
      options: [{ optionKey: 'a', label: 'A', value: 'alpha', sortOrder: 0 }],
    })
    expect(normalizeAnswer(node, 'a')).toBe('alpha')
  })
})

describe('getAnswerValidationError', () => {
  it('returns null for valid answers', () => {
    const node = makeNode({
      nodeKey: 'q1',
      type: 'question',
      title: 'Q',
      content: { inputType: 'single' },
      options: [{ optionKey: 'a', label: 'A', value: 'alpha', sortOrder: 0 }],
    })
    expect(getAnswerValidationError(node, 'a')).toBeNull()
  })

  it('returns Dutch error messages', () => {
    const node = makeNode({
      nodeKey: 'lead',
      type: 'lead_capture',
      title: 'E-mail',
    })
    expect(getAnswerValidationError(node, 'bad')).toContain('e-mailadres')
  })
})
