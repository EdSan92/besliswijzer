import { describe, expect, it } from 'vitest'
import { validateGoogleKeywordLiveConfig } from './validate-live-config.js'

describe('validateGoogleKeywordLiveConfig', () => {
  it('rejects mock mode', () => {
    const result = validateGoogleKeywordLiveConfig({
      mock: true,
      developerToken: 'dev',
      customerId: '123',
      accessToken: 'token',
    })

    expect(result.ok).toBe(false)
    expect(result.missing).toContain('GOOGLE_KEYWORD_INSIGHT_MOCK=false')
  })

  it('requires Google Ads credentials when mock is disabled', () => {
    const result = validateGoogleKeywordLiveConfig({ mock: false })

    expect(result.ok).toBe(false)
    expect(result.missing).toEqual(
      expect.arrayContaining([
        'GOOGLE_ADS_DEVELOPER_TOKEN',
        'GOOGLE_ADS_CUSTOMER_ID',
        'GOOGLE_ADS_ACCESS_TOKEN',
      ]),
    )
  })

  it('accepts complete live config', () => {
    const result = validateGoogleKeywordLiveConfig({
      mock: false,
      developerToken: 'dev',
      customerId: '123',
      accessToken: 'token',
    })

    expect(result).toEqual({ ok: true })
  })
})
