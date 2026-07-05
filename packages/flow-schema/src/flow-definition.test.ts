import { describe, expect, it } from 'vitest'
import { flowDefinitionSchema, validateFlowDefinition } from './index.js'

const minimalFlow = {
  slug: 'demo-flow',
  title: 'Demo flow',
  nodes: [
    {
      nodeKey: 'start',
      type: 'question' as const,
      title: 'Start',
      content: { inputType: 'single' as const },
      sortOrder: 0,
      isEntry: true,
      options: [{ optionKey: 'yes', label: 'Ja', value: 'yes', sortOrder: 0 }],
    },
  ],
  rules: [],
  results: [],
}

describe('flowDefinitionSchema', () => {
  it('parses a minimal flow', () => {
    expect(flowDefinitionSchema.parse(minimalFlow).slug).toBe('demo-flow')
  })

  it('rejects duplicate node keys', () => {
    const errors = validateFlowDefinition({
      ...minimalFlow,
      nodes: [
        ...minimalFlow.nodes,
        { ...minimalFlow.nodes[0]!, nodeKey: 'start', title: 'Duplicate' },
      ],
    })
    expect(errors).toContain('Node keys must be unique')
  })

  it('requires an entry node', () => {
    const errors = validateFlowDefinition({
      ...minimalFlow,
      nodes: [{ ...minimalFlow.nodes[0]!, isEntry: false }],
    })
    expect(errors).toContain('At least one node must have isEntry: true')
  })
})
