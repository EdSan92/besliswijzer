import { describe, expect, it } from 'vitest'
import { toSlug, toUserFacingFetchError } from './fetch-errors'

describe('toUserFacingFetchError', () => {
  it('maps known API errors to Dutch messages', () => {
    expect(toUserFacingFetchError({ data: { error: 'Invalid answer for node' } })).toContain('invoer')
    expect(toUserFacingFetchError({ data: { error: 'Validation error' } })).toContain('sessie')
  })

  it('returns server error text when available', () => {
    expect(toUserFacingFetchError({ data: { error: 'Flow not found' } })).toBe('Flow not found')
  })

  it('falls back to default message', () => {
    expect(toUserFacingFetchError(null)).toBe('Er ging iets mis. Probeer het opnieuw.')
    expect(toUserFacingFetchError(null, 'Custom fallback')).toBe('Custom fallback')
  })
})

describe('toSlug', () => {
  it('creates URL-safe slugs', () => {
    expect(toSlug('Warmtepomp Keuzehulp')).toBe('warmtepomp-keuzehulp')
    expect(toSlug('  Robot Grasmaaier!  ')).toBe('robot-grasmaaier')
  })
})
