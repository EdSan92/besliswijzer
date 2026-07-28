import { describe, expect, it } from 'vitest'
import {
  parseContentPackageGenerationOutput,
  validateParsedContentPackageOutput,
} from './validate-output.js'
import { invalidGenerationOutput, validGenerationOutput } from './fixtures/generation-output.js'

describe('parseContentPackageGenerationOutput', () => {
  it('parses wrapped generation output', () => {
    const parsed = parseContentPackageGenerationOutput(validGenerationOutput)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.output.content.slug).toBe('airfryers')
      expect(parsed.output.internalLinks).toHaveLength(1)
      expect(parsed.output.claims).toHaveLength(1)
    }
  })

  it('rejects free-form text outside the schema', () => {
    const parsed = parseContentPackageGenerationOutput('Dit is geen JSON contentpakket')
    expect(parsed.ok).toBe(false)
  })

  it('rejects structurally invalid content payloads', () => {
    const parsed = parseContentPackageGenerationOutput(invalidGenerationOutput)
    expect(parsed.ok).toBe(false)
  })
})

describe('validateParsedContentPackageOutput', () => {
  it('accepts semantically valid content packages', () => {
    const parsed = parseContentPackageGenerationOutput(validGenerationOutput)
    if (!parsed.ok) {
      throw new Error('Expected valid fixture')
    }

    expect(validateParsedContentPackageOutput(parsed.output)).toEqual([])
  })

  it('rejects empty required sections', () => {
    const parsed = parseContentPackageGenerationOutput(invalidGenerationOutput)
    if (parsed.ok) {
      throw new Error('Expected invalid fixture')
    }

    expect(parsed.ok).toBe(false)
  })
})
