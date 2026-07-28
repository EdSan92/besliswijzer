import { describe, expect, it } from 'vitest'
import type { FlowDefinition } from '@besliswijzer/flow-schema'
import { validateFlowGraph } from './validate-flow-graph.js'

const baseFlow = (): FlowDefinition => ({
  slug: 'demo-flow',
  title: 'Demo',
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
      nodeKey: 'end',
      type: 'lead_capture',
      title: 'Lead',
      content: {},
      sortOrder: 1,
      isEntry: false,
      options: [],
    },
  ],
  rules: [
    {
      fromNodeKey: 'start',
      ruleType: 'branch',
      condition: {},
      targetNodeKey: 'end',
      priority: 10,
    },
    {
      fromNodeKey: 'end',
      ruleType: 'result_map',
      condition: {},
      targetResultKey: 'result_a',
      priority: 10,
    },
  ],
  results: [{ resultKey: 'result_a', title: 'A', body: {}, ctas: [] }],
})

describe('validateFlowGraph', () => {
  it('accepts a reachable acyclic flow with results', () => {
    expect(validateFlowGraph(baseFlow())).toEqual([])
  })

  it('rejects unreachable nodes', () => {
    const errors = validateFlowGraph({
      ...baseFlow(),
      nodes: [
        ...baseFlow().nodes,
        {
          nodeKey: 'orphan',
          type: 'question',
          title: 'Orphan',
          content: { inputType: 'single' },
          sortOrder: 2,
          isEntry: false,
          options: [],
        },
      ],
    })

    expect(errors.some((error) => error.includes('unreachable'))).toBe(true)
  })

  it('rejects cycles', () => {
    const errors = validateFlowGraph({
      ...baseFlow(),
      rules: [
        {
          fromNodeKey: 'start',
          ruleType: 'branch',
          condition: {},
          targetNodeKey: 'end',
          priority: 10,
        },
        {
          fromNodeKey: 'end',
          ruleType: 'branch',
          condition: {},
          targetNodeKey: 'start',
          priority: 10,
        },
        {
          fromNodeKey: 'end',
          ruleType: 'result_map',
          condition: {},
          targetResultKey: 'result_a',
          priority: 5,
        },
      ],
    })

    expect(errors.some((error) => error.includes('Cycle detected'))).toBe(true)
  })

  it('rejects nodes without a path to a result', () => {
    const errors = validateFlowGraph({
      ...baseFlow(),
      rules: [
        {
          fromNodeKey: 'start',
          ruleType: 'branch',
          condition: {},
          targetNodeKey: 'end',
          priority: 10,
        },
      ],
    })

    expect(errors.some((error) => error.includes('no path to a result'))).toBe(true)
  })

  it('rejects duplicate node sort orders', () => {
    const flow = baseFlow()
    flow.nodes[1]!.sortOrder = 0
    const errors = validateFlowGraph(flow)
    expect(errors).toContain('Node sortOrder values must be unique')
  })
})
