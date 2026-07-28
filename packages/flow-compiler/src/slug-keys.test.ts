import { describe, expect, it } from 'vitest'
import { isValidKey, isValidSlug, sanitizeKey, sanitizeSlug } from './slug-keys.js'

describe('sanitizeSlug', () => {
  it('normalizes text to kebab-case slugs', () => {
    expect(sanitizeSlug('Airfryer Keuzehulp!')).toBe('airfryer-keuzehulp')
    expect(isValidSlug(sanitizeSlug('Airfryer Keuzehulp!'))).toBe(true)
  })

  it('falls back for empty input', () => {
    expect(sanitizeSlug('!!!')).toBe('keuzehulp')
  })
})

describe('sanitizeKey', () => {
  it('normalizes text to snake_case keys', () => {
    expect(sanitizeKey('5+ personen')).toBe('5_personen')
    expect(isValidKey(sanitizeKey('5+ personen'))).toBe(true)
  })
})
