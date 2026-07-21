import { describe, expect, it } from 'vitest'
import { extractJsonFromText } from './ai-provider.interface.js'

describe('extractJsonFromText', () => {
  it('parses plain JSON', () => {
    expect(extractJsonFromText('{"pageTitle":"Test"}')).toEqual({ pageTitle: 'Test' })
  })

  it('parses fenced JSON', () => {
    expect(extractJsonFromText('```json\n{"pageTitle":"Test"}\n```')).toEqual({ pageTitle: 'Test' })
  })

  it('ignores trailing text after a JSON object', () => {
    expect(
      extractJsonFromText('{"pageTitle":"Test","hero":{"headline":"H"}} Extra uitleg van Gemini.'),
    ).toEqual({ pageTitle: 'Test', hero: { headline: 'H' } })
  })
})
