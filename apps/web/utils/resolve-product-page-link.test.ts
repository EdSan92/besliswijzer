import { describe, expect, it } from 'vitest'
import { resolveProductPageLink } from './resolve-flow-href'

describe('resolveProductPageLink', () => {
  it('returns SEO page path when robotmaaiers is mapped', () => {
    expect(
      resolveProductPageLink('robotmaaiers', { robotmaaiers: 'robotmaaier-kiezen' }),
    ).toBe('/robotmaaier-kiezen')
  })

  it('returns null when only the standalone flow route exists', () => {
    expect(resolveProductPageLink('warmtepomp-keuzehulp', {})).toBeNull()
  })
})
