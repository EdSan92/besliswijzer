import { describe, expect, it } from 'vitest'
import {
  CORRECTABLE_ARTIFACT_KINDS,
  formatArtifactPayload,
  isCorrectableArtifactKind,
  parseArtifactCorrectionJson,
} from './pipeline-artifact-correction.js'

describe('pipeline-artifact-correction', () => {
  it('parses valid JSON payloads', () => {
    const result = parseArtifactCorrectionJson('{"content":{"slug":"airfryers"}}')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload.content).toEqual({ slug: 'airfryers' })
    }
  })

  it('rejects invalid JSON', () => {
    const result = parseArtifactCorrectionJson('{ invalid')
    expect(result.ok).toBe(false)
  })

  it('rejects non-object payloads', () => {
    const result = parseArtifactCorrectionJson('"text"')
    expect(result.ok).toBe(false)
  })

  it('identifies correctable artifact kinds', () => {
    expect(isCorrectableArtifactKind('flow_brief')).toBe(true)
    expect(isCorrectableArtifactKind('quality_report')).toBe(false)
    expect(CORRECTABLE_ARTIFACT_KINDS).toContain('content_package')
  })

  it('formats artifact payloads for editing', () => {
    expect(formatArtifactPayload({ slug: 'test' })).toBe('{\n  "slug": "test"\n}')
  })
})
