import { describe, expect, it } from 'vitest'
import { generateContentPackage, ContentPackageGenerationError } from './generate.js'
import { invalidGenerationOutput, validGenerationOutput } from './fixtures/generation-output.js'
import { MockContentPackageModelProvider } from './providers/mock-content-package.provider.js'

const baseInput = {
  categorySlug: 'airfryers',
  categoryTitle: 'Airfryer keuzehulp',
  language: 'nl',
  searchIntent: 'commercial',
  keywordVariants: ['airfryer kopen'],
  questions: ['Welke airfryer is het beste?'],
  buyingCriteria: ['Capaciteit', 'Budget'],
  existingRoutes: ['robotstofzuigers'],
}

describe('generateContentPackage', () => {
  it('returns a validated draft content package artifact from fixed model output', async () => {
    const provider = new MockContentPackageModelProvider({
      provider: 'gemini',
      model: 'gemini-3.1-flash-lite',
      initialResponse: validGenerationOutput,
    })

    const artifact = await generateContentPackage({
      provider,
      input: baseInput,
      now: () => '2026-07-28T12:00:00.000Z',
    })

    expect(artifact.kind).toBe('content_package')
    expect(artifact.status).toBe('draft')
    expect(artifact.content.slug).toBe('airfryers')
    expect(artifact.internalLinks).toHaveLength(1)
    expect(artifact.model).toEqual({
      provider: 'gemini',
      name: 'gemini-3.1-flash-lite',
    })
    expect(artifact.warnings.length).toBeGreaterThanOrEqual(0)
  })

  it('uses one repair attempt for invalid initial output', async () => {
    const provider = new MockContentPackageModelProvider({
      initialResponse: invalidGenerationOutput,
      repairResponse: validGenerationOutput,
    })

    const artifact = await generateContentPackage({
      provider,
      input: baseInput,
      now: () => '2026-07-28T12:00:00.000Z',
    })

    expect(artifact.content.slug).toBe('airfryers')
    expect(provider.getGenerateCalls()).toBe(1)
  })

  it('rejects free text model output without repair support', async () => {
    const provider = new MockContentPackageModelProvider({
      initialResponse: 'Geen JSON',
    })

    await expect(
      generateContentPackage({
        provider,
        input: baseInput,
      }),
    ).rejects.toBeInstanceOf(ContentPackageGenerationError)
  })

  it('fails when repair does not fix validation errors', async () => {
    const provider = new MockContentPackageModelProvider({
      initialResponse: invalidGenerationOutput,
      repairResponse: invalidGenerationOutput,
    })

    await expect(
      generateContentPackage({
        provider,
        input: baseInput,
      }),
    ).rejects.toMatchObject({
      code: 'REPAIR_FAILED',
    })
  })
})
