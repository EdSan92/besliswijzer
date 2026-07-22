import { describe, expect, it } from 'vitest'
import { resolveFlowHref } from './resolve-flow-href'

describe('resolveFlowHref', () => {
  it('links to product page when a mapping exists', () => {
    expect(
      resolveFlowHref('robotmaaiers', { robotmaaiers: 'robotmaaier-kiezen' }),
    ).toBe('/robotmaaier-kiezen')
  })

  it('falls back to flow route when no mapping exists', () => {
    expect(resolveFlowHref('warmtepomp-keuzehulp', {})).toBe('/flows/warmtepomp-keuzehulp')
  })
})
