import { describe, expect, it, vi } from 'vitest'
import { ProductFlowAgent } from './product-flow.agent.js'

describe('ProductFlowAgent', () => {
  it('generates a merged flow with canonical slug', async () => {
    const flow = {
      title: 'Robotmaaier kiezen',
      slug: 'robotmaaiers',
      description: 'Vind de juiste robotmaaier',
      seoTitle: 'Robotmaaier kiezen',
      seoDescription: 'Keuzehulp',
      nodes: [],
      rules: [],
      results: [],
    }

    const aiProvider = {
      generateObject: vi.fn().mockResolvedValue({ data: flow }),
    }
    const promptBuilder = {
      generateProductFlow: vi.fn().mockReturnValue('prompt'),
    }

    const agent = new ProductFlowAgent(aiProvider as never, promptBuilder as never)
    const result = await agent.generate({
      productSlug: 'robotmaaier',
      productTitle: 'Robotmaaier',
      canonicalName: 'robotmaaier',
      categoryTitle: 'Tuin',
      flowSlug: 'robotmaaiers',
      keywords: ['robotmaaier gps', 'robotmaaier helling'],
    })

    expect(promptBuilder.generateProductFlow).toHaveBeenCalledOnce()
    expect(result.slug).toBe('robotmaaiers')
  })
})
