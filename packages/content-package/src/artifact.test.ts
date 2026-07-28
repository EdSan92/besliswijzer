import { describe, expect, it } from 'vitest'
import { createContentPackageArtifact, contentPackageArtifactSchema } from './artifact.js'
import airfryerContent from './fixtures/airfryer-content-package.json' with { type: 'json' }

describe('contentPackageArtifactSchema', () => {
  it('accepts a draft content package artifact', () => {
    const artifact = createContentPackageArtifact({
      promptVersion: '1.0.0',
      content: airfryerContent,
      internalLinks: [{ slug: 'robotstofzuigers', title: 'Robotstofzuiger', reason: 'Related' }],
      claims: [{ id: 'c1', text: 'Example claim', requiresSource: true }],
      warnings: [],
      model: { provider: 'mock', name: 'mock-model' },
      generatedAt: '2026-07-28T12:00:00.000Z',
    })

    const parsed = contentPackageArtifactSchema.parse(artifact)
    expect(parsed.kind).toBe('content_package')
    expect(parsed.status).toBe('draft')
  })
})
