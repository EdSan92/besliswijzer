import { describe, expect, it } from 'vitest'
import { validateCmsLiveConfig } from './validate-live-config.js'

describe('validateCmsLiveConfig', () => {
  it('rejects mock mode', () => {
    const result = validateCmsLiveConfig({
      mock: true,
      apiBase: 'https://api.staging.test',
      adminApiKey: 'admin-key',
    })

    expect(result.ok).toBe(false)
    expect(result.missing).toContain('CMS_PUBLISH_MOCK=false')
  })

  it('requires staging API base and admin key when mock is disabled', () => {
    const result = validateCmsLiveConfig({ mock: false })

    expect(result.ok).toBe(false)
    expect(result.missing).toEqual(
      expect.arrayContaining(['BESLIJSWIJZER_API_BASE', 'ADMIN_API_KEY']),
    )
  })

  it('accepts complete live config', () => {
    const result = validateCmsLiveConfig({
      mock: false,
      apiBase: 'https://api.staging.test',
      adminApiKey: 'admin-key',
    })

    expect(result).toEqual({ ok: true })
  })
})
