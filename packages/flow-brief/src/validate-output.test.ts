import { describe, expect, it } from 'vitest'
import { parseFlowBriefGenerationOutput, validateParsedFlowBriefOutput } from './validate-output.js'
import { invalidGenerationOutput, validGenerationOutput } from './fixtures/generation-output.js'

describe('parseFlowBriefGenerationOutput', () => {
  it('parses wrapped generation output', () => {
    const parsed = parseFlowBriefGenerationOutput(validGenerationOutput)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.output.brief.slug).toBe('airfryers')
      expect(parsed.output.warnings).toHaveLength(1)
    }
  })

  it('rejects free-form text outside the schema', () => {
    const parsed = parseFlowBriefGenerationOutput('Dit is geen JSON flowbrief')
    expect(parsed.ok).toBe(false)
  })

  it('rejects structurally invalid brief payloads', () => {
    const parsed = parseFlowBriefGenerationOutput(invalidGenerationOutput)
    expect(parsed.ok).toBe(false)
  })
})

describe('validateParsedFlowBriefOutput', () => {
  it('accepts semantically valid compiler briefs', () => {
    const parsed = parseFlowBriefGenerationOutput(validGenerationOutput)
    if (!parsed.ok) {
      throw new Error('Expected valid fixture')
    }

    expect(validateParsedFlowBriefOutput(parsed.output)).toEqual([])
  })
})
