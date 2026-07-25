import { describe, expect, it } from 'vitest'
import { resolveFlowHref, productPageLinkLabel } from './resolve-flow-href'

describe('resolveFlowHref', () => {
  it('links to product page when a mapping exists', () => {
    expect(
      resolveFlowHref('robotmaaiers', { robotmaaiers: 'robotmaaier-kiezen' }),
    ).toBe('/robotmaaier-kiezen')
  })

  it('links airfryers to the SEO product page', () => {
    expect(resolveFlowHref('airfryers', { airfryers: 'airfryer-kiezen' })).toBe('/airfryer-kiezen')
  })

  it('falls back to flow route when no mapping exists', () => {
    expect(resolveFlowHref('warmtepomp-keuzehulp', {})).toBe('/flows/warmtepomp-keuzehulp')
  })
})

describe('productPageLinkLabel', () => {
  it('returns category-specific labels for mapped flows', () => {
    expect(productPageLinkLabel('airfryers')).toBe('Meer over airfryers')
    expect(productPageLinkLabel('robotmaaiers')).toBe('Meer over robotmaaiers')
  })

  it('falls back to generic label for unknown flows', () => {
    expect(productPageLinkLabel('warmtepomp-keuzehulp')).toBe('Meer informatie')
  })
})
