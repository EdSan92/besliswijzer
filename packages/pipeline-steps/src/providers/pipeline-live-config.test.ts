import { describe, expect, it } from 'vitest'
import {
  PipelineLiveConfigError,
  readPipelineLiveConfigFromEnv,
  validatePipelineLiveConfig,
} from './pipeline-live-config.js'

describe('pipeline live config', () => {
  it('defaults to mock mode when live flag is off', () => {
    const config = readPipelineLiveConfigFromEnv({
      PIPELINE_USE_LIVE_PROVIDERS: 'false',
    })

    expect(config.useLiveProviders).toBe(false)
    expect(validatePipelineLiveConfig(config)).toEqual({ ok: true })
  })

  it('requires gemini key and google ads credentials in live mode', () => {
    const config = readPipelineLiveConfigFromEnv({
      PIPELINE_USE_LIVE_PROVIDERS: 'true',
      GOOGLE_KEYWORD_INSIGHT_MOCK: 'false',
    })

    const result = validatePipelineLiveConfig(config)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing).toContain('GEMINI_API_KEY')
      expect(result.missing.some((entry) => entry.includes('GOOGLE_ADS'))).toBe(true)
    }
  })

  it('accepts live config when required secrets are present', () => {
    const config = readPipelineLiveConfigFromEnv({
      PIPELINE_USE_LIVE_PROVIDERS: 'true',
      GEMINI_API_KEY: 'test-key',
      GOOGLE_ADS_DEVELOPER_TOKEN: 'dev',
      GOOGLE_ADS_CUSTOMER_ID: '123',
      GOOGLE_ADS_ACCESS_TOKEN: 'token',
      CMS_PUBLISH_MOCK: 'true',
    })

    expect(validatePipelineLiveConfig(config)).toEqual({ ok: true })
  })

  it('throws PipelineLiveConfigError with readable message', () => {
    const config = readPipelineLiveConfigFromEnv({
      PIPELINE_USE_LIVE_PROVIDERS: 'true',
    })

    expect(() => validatePipelineLiveConfig(config, { throwOnError: true })).toThrow(
      PipelineLiveConfigError,
    )
  })
})
