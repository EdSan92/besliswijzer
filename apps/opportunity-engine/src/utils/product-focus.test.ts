import { describe, expect, it } from 'vitest'
import {
  isExcludedHighConsiderationProduct,
  isWebshopFocusedKeyword,
} from '../utils/product-focus.js'

describe('product-focus', () => {
  it('excludes warmtepomp and zonnepanelen', () => {
    expect(isExcludedHighConsiderationProduct('warmtepomp kopen')).toBe(true)
    expect(isExcludedHighConsiderationProduct('zonnepanelen vergelijken')).toBe(true)
    expect(isExcludedHighConsiderationProduct('beste airfryer')).toBe(false)
  })

  it('accepts webshop product keywords', () => {
    expect(isWebshopFocusedKeyword('beste robotstofzuiger 2026')).toBe(true)
    expect(isWebshopFocusedKeyword('warmtepomp installatie')).toBe(false)
  })
})
