import { describe, expect, it } from 'vitest'
import {
  analyticsBatchSchema,
  flowDefinitionSchema,
  flowImportRequestSchema,
  leadSubmissionSchema,
  stepRequestSchema,
  validateFlowDefinition,
} from './index.js'

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

  it('rejects invalid slugs', () => {
    const result = flowDefinitionSchema.safeParse({ ...minimalFlow, slug: 'Invalid Slug!' })
    expect(result.success).toBe(false)
  })
})

describe('validateFlowDefinition', () => {
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

  it('rejects duplicate result keys', () => {
    const errors = validateFlowDefinition({
      ...minimalFlow,
      results: [
        { resultKey: 'a', title: 'A', body: {} },
        { resultKey: 'a', title: 'A2', body: {} },
      ],
    })
    expect(errors).toContain('Result keys must be unique')
  })

  it('requires an entry node', () => {
    const errors = validateFlowDefinition({
      ...minimalFlow,
      nodes: [{ ...minimalFlow.nodes[0]!, isEntry: false }],
    })
    expect(errors).toContain('At least one node must have isEntry: true')
  })

  it('allows only one entry node', () => {
    const errors = validateFlowDefinition({
      ...minimalFlow,
      nodes: [
        { ...minimalFlow.nodes[0]! },
        {
          nodeKey: 'second',
          type: 'question',
          title: 'Second',
          content: { inputType: 'single' },
          sortOrder: 1,
          isEntry: true,
          options: [],
        },
      ],
    })
    expect(errors).toContain('Only one node may have isEntry: true')
  })

  it('rejects duplicate option keys on a node', () => {
    const errors = validateFlowDefinition({
      ...minimalFlow,
      nodes: [
        {
          ...minimalFlow.nodes[0]!,
          options: [
            { optionKey: 'dup', label: 'A', value: 'a', sortOrder: 0 },
            { optionKey: 'dup', label: 'B', value: 'b', sortOrder: 1 },
          ],
        },
      ],
    })
    expect(errors.some((error) => error.includes('Duplicate option keys'))).toBe(true)
  })

  it('rejects unknown rule references', () => {
    const errors = validateFlowDefinition({
      ...minimalFlow,
      rules: [
        {
          fromNodeKey: 'missing',
          ruleType: 'branch',
          condition: {},
          targetNodeKey: 'start',
          priority: 0,
        },
      ],
    })
    expect(errors.some((error) => error.includes('unknown fromNodeKey'))).toBe(true)
  })

  it('requires branch targetNodeKey and result_map targetResultKey', () => {
    const branchErrors = validateFlowDefinition({
      ...minimalFlow,
      rules: [
        {
          fromNodeKey: 'start',
          ruleType: 'branch',
          condition: {},
          priority: 0,
        },
      ],
    })
    expect(branchErrors.some((error) => error.includes('needs targetNodeKey'))).toBe(true)

    const resultErrors = validateFlowDefinition({
      ...minimalFlow,
      results: [{ resultKey: 'r1', title: 'R', body: {} }],
      rules: [
        {
          fromNodeKey: '*',
          ruleType: 'result_map',
          condition: {},
          priority: 0,
        },
      ],
    })
    expect(resultErrors.some((error) => error.includes('needs targetResultKey'))).toBe(true)
  })
})

describe('request schemas', () => {
  it('validates step requests', () => {
    const result = stepRequestSchema.safeParse({
      sessionId: '00000000-0000-0000-0000-000000000099',
      nodeKey: 'start',
      answer: 'yes',
    })
    expect(result.success).toBe(true)
  })

  it('rejects analytics batches over 50 events', () => {
    const events = Array.from({ length: 51 }, () => ({
      flowId: '00000000-0000-0000-0000-000000000001',
      flowVersionId: '00000000-0000-0000-0000-000000000002',
      sessionId: '00000000-0000-0000-0000-000000000099',
      eventType: 'flow_start' as const,
    }))
    expect(analyticsBatchSchema.safeParse({ events }).success).toBe(false)
  })

  it('validates lead submissions and rejects invalid email', () => {
    expect(
      leadSubmissionSchema.safeParse({
        sessionId: '00000000-0000-0000-0000-000000000099',
        email: 'user@example.com',
      }).success,
    ).toBe(true)

    expect(
      leadSubmissionSchema.safeParse({
        sessionId: '00000000-0000-0000-0000-000000000099',
        email: 'not-an-email',
      }).success,
    ).toBe(false)
  })

  it('applies import request defaults', () => {
    const parsed = flowImportRequestSchema.parse({ flow: minimalFlow })
    expect(parsed.publish).toBe(false)
    expect(parsed.overwrite).toBe(false)
  })
})
