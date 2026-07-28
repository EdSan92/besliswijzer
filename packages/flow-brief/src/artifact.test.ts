import { describe, expect, it } from 'vitest'
import { createFlowBriefArtifact, flowBriefArtifactSchema } from './artifact.js'
import airfryerBrief from './fixtures/airfryer-flowbrief.json' with { type: 'json' }

describe('flowBriefArtifactSchema', () => {
  it('accepts a validated flowbrief artifact', () => {
    const artifact = createFlowBriefArtifact({
      promptVersion: '1.0.0',
      brief: airfryerBrief,
      warnings: [],
      model: { provider: 'mock', name: 'mock-model' },
      generatedAt: '2026-07-28T12:00:00.000Z',
    })

    expect(flowBriefArtifactSchema.parse(artifact).kind).toBe('flow_brief')
  })
})
