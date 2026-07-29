import { describe, expect, it } from 'vitest'
import { MockFlowBriefModelProvider } from '@besliswijzer/flow-brief'
import { MockContentPackageModelProvider } from '@besliswijzer/content-package'
import { FakeCmsPublishProvider } from '@besliswijzer/pipeline-publish'
import { createPipelineProviders } from './create-pipeline-providers.js'

describe('createPipelineProviders', () => {
  it('returns mock providers by default', () => {
    const providers = createPipelineProviders({
      env: {
        PIPELINE_USE_LIVE_PROVIDERS: 'false',
      },
    })

    expect(providers.flowBriefProvider).toBeInstanceOf(MockFlowBriefModelProvider)
    expect(providers.contentPackageProvider).toBeInstanceOf(MockContentPackageModelProvider)
    expect(providers.cmsPublishProvider).toBeInstanceOf(FakeCmsPublishProvider)
  })

  it('returns gemini providers in live mode when configured', () => {
    const providers = createPipelineProviders({
      env: {
        PIPELINE_USE_LIVE_PROVIDERS: 'true',
        GEMINI_API_KEY: 'test-key',
        GOOGLE_KEYWORD_INSIGHT_MOCK: 'true',
        CMS_PUBLISH_MOCK: 'true',
      },
    })

    expect(providers.flowBriefProvider.provider).toBe('gemini')
    expect(providers.contentPackageProvider.provider).toBe('gemini')
    expect(providers.cmsPublishProvider).toBeInstanceOf(FakeCmsPublishProvider)
  })
})
