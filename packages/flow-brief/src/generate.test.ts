import { describe, expect, it } from 'vitest'
import { generateFlowBrief, FlowBriefGenerationError } from './generate.js'
import { invalidGenerationOutput, validGenerationOutput } from './fixtures/generation-output.js'
import { MockFlowBriefModelProvider } from './providers/mock-flowbrief.provider.js'

const baseInput = {
  categorySlug: 'airfryers',
  categoryTitle: 'Airfryer keuzehulp',
  language: 'nl',
  searchIntent: 'commercial',
  keywordVariants: ['airfryer kopen'],
  questions: ['Welke airfryer is het beste?'],
}

describe('generateFlowBrief', () => {
  it('returns a validated flowbrief artifact from fixed model output', async () => {
    const provider = new MockFlowBriefModelProvider({
      provider: 'gemini',
      model: 'gemini-3.1-flash-lite',
      initialResponse: validGenerationOutput,
    })

    const artifact = await generateFlowBrief({
      provider,
      input: baseInput,
      now: () => '2026-07-28T12:00:00.000Z',
    })

    expect(artifact.kind).toBe('flow_brief')
    expect(artifact.brief.slug).toBe('airfryers')
    expect(artifact.model).toEqual({
      provider: 'gemini',
      name: 'gemini-3.1-flash-lite',
    })
    expect(artifact.warnings.some((warning) => warning.code === 'MISSING_SOURCE')).toBe(true)
  })

  it('uses one repair attempt for invalid initial output', async () => {
    const provider = new MockFlowBriefModelProvider({
      initialResponse: invalidGenerationOutput,
      repairResponse: validGenerationOutput,
    })

    const artifact = await generateFlowBrief({
      provider,
      input: baseInput,
      now: () => '2026-07-28T12:00:00.000Z',
    })

    expect(artifact.brief.slug).toBe('airfryers')
    expect(provider.getGenerateCalls()).toBe(1)
  })

  it('rejects free text model output without repair support', async () => {
    const provider = new MockFlowBriefModelProvider({
      initialResponse: 'Geen JSON',
    })

    await expect(
      generateFlowBrief({
        provider,
        input: baseInput,
      }),
    ).rejects.toBeInstanceOf(FlowBriefGenerationError)
  })

  it('fails when repair does not fix validation errors', async () => {
    const provider = new MockFlowBriefModelProvider({
      initialResponse: invalidGenerationOutput,
      repairResponse: invalidGenerationOutput,
    })

    await expect(
      generateFlowBrief({
        provider,
        input: baseInput,
      }),
    ).rejects.toMatchObject({
      code: 'REPAIR_FAILED',
    })
  })
})
