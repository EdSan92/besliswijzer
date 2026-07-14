import { describe, expect, it } from 'vitest'
import type { FlowSnapshot } from '@besliswijzer/flow-schema'
import { FlowImportError } from './flow-import-export-service.js'
import { stripRulesFromSnapshot } from './flow-service.js'

describe('FlowImportError', () => {
  it('stores status code with message', () => {
    const error = new FlowImportError('Category not found', 404)
    expect(error.message).toBe('Category not found')
    expect(error.statusCode).toBe(404)
    expect(error.name).toBe('FlowImportError')
  })
})

describe('stripRulesFromSnapshot', () => {
  it('removes rules and results from public snapshots', () => {
    const snapshot: FlowSnapshot = {
      flowId: '00000000-0000-0000-0000-000000000001',
      versionId: '00000000-0000-0000-0000-000000000002',
      versionNumber: 1,
      slug: 'demo',
      title: 'Demo',
      seo: { title: 'Demo', description: 'Demo' },
      nodes: [],
      rules: [
        {
          fromNodeKey: 'start',
          ruleType: 'branch',
          condition: {},
          targetNodeKey: 'end',
          priority: 0,
        },
      ],
      results: [{ resultKey: 'r1', title: 'Result', body: {} }],
    }

    const stripped = stripRulesFromSnapshot(snapshot)
    expect(stripped).not.toHaveProperty('rules')
    expect(stripped).not.toHaveProperty('results')
    expect(stripped.slug).toBe('demo')
  })
})
