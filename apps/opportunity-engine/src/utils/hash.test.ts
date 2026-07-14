import { describe, expect, it } from 'vitest'
import { hashPrompt, toSlug } from './hash.js'

describe('hash', () => {
  it('creates stable prompt hashes', () => {
    expect(hashPrompt('hello')).toBe(hashPrompt('hello'))
    expect(hashPrompt('hello')).not.toBe(hashPrompt('world'))
    expect(hashPrompt('hello')).toHaveLength(16)
  })

  it('slugifies values', () => {
    expect(toSlug('Robot Grasmaaier Keuzehulp')).toBe('robot-grasmaaier-keuzehulp')
    expect(toSlug('  --Hello World--  ')).toBe('hello-world')
  })
})
