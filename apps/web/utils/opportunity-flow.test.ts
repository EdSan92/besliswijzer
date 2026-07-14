import { describe, expect, it } from 'vitest'
import type { OpportunityFlowNode } from '~/types/opportunity-flow'
import {
  buildFlowEdges,
  formatFlowCondition,
  isOpportunityFlowDefinition,
  orderNodesByFlow,
} from './opportunity-flow'

const nodes: OpportunityFlowNode[] = [
  {
    nodeKey: 'budget',
    type: 'question_single',
    title: 'Budget',
    isEntry: true,
    options: [
      { value: 'low', label: 'Laag' },
      { value: 'high', label: 'Hoog' },
    ],
  },
  {
    nodeKey: 'tuin',
    type: 'question_single',
    title: 'Tuin',
    options: [{ value: 'small', label: 'Klein' }],
  },
  {
    nodeKey: 'los',
    type: 'info',
    title: 'Losse node',
  },
]

describe('isOpportunityFlowDefinition', () => {
  it('accepts valid flow definitions', () => {
    expect(
      isOpportunityFlowDefinition({
        title: 'Robot grasmaaier',
        slug: 'robot-grasmaaier',
        description: 'Keuzehulp',
        nodes: [],
        rules: [],
        results: [],
      }),
    ).toBe(true)
  })

  it('rejects invalid values', () => {
    expect(isOpportunityFlowDefinition(null)).toBe(false)
    expect(isOpportunityFlowDefinition({ title: 'x' })).toBe(false)
  })
})

describe('formatFlowCondition', () => {
  it('formats equality conditions with option labels', () => {
    const label = formatFlowCondition(
      { '==': [{ var: 'answers.budget' }, 'low'] },
      nodes,
    )
    expect(label).toBe('als "Laag"')
  })

  it('returns altijd for empty conditions', () => {
    expect(formatFlowCondition({}, nodes)).toBe('altijd')
    expect(formatFlowCondition(undefined, nodes)).toBe('altijd')
  })
})

describe('buildFlowEdges and orderNodesByFlow', () => {
  it('builds labeled edges and orders nodes by traversal', () => {
    const edges = buildFlowEdges(
      [
        {
          fromNodeKey: 'budget',
          targetNodeKey: 'tuin',
          condition: { '==': [{ var: 'answers.budget' }, 'high'] },
        },
      ],
      nodes,
    )

    expect(edges[0]?.label).toBe('als "Hoog"')

    const ordered = orderNodesByFlow(nodes, edges)
    expect(ordered.map((node) => node.nodeKey)).toEqual(['budget', 'tuin', 'los'])
  })
})
