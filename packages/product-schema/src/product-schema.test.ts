import { describe, expect, it } from 'vitest'
import { contentBlockSchema, sortContentBlocks } from './content-block.js'
import { validateProductPageBlocks } from './product-page.js'

describe('contentBlockSchema', () => {
  it('parses hero block', () => {
    const block = contentBlockSchema.parse({
      id: 'blk_hero',
      type: 'hero',
      sortOrder: 0,
      visible: true,
      source: 'manual',
      data: { headline: 'Test' },
    })
    expect(block.type).toBe('hero')
  })

  it('parses flow block', () => {
    const block = contentBlockSchema.parse({
      id: 'blk_flow',
      type: 'flow',
      sortOrder: 1,
      visible: true,
      source: 'manual',
      data: {
        flowId: 'd9e3babb-90d1-4f4b-9c7d-1969cc15ce0b',
        flowSlug: 'robotmaaiers',
        displayMode: 'section',
      },
    })
    expect(block.type).toBe('flow')
    if (block.type === 'flow') {
      expect(block.data.flowSlug).toBe('robotmaaiers')
    }
  })
})

describe('sortContentBlocks', () => {
  const blocks = [
    {
      id: 'a',
      type: 'hero' as const,
      sortOrder: 0,
      visible: true,
      source: 'manual' as const,
      data: { headline: 'A' },
    },
    {
      id: 'b',
      type: 'faq' as const,
      sortOrder: 2,
      visible: true,
      source: 'manual' as const,
      data: { items: [{ id: '1', question: 'Q', answer: 'A' }] },
    },
  ]

  it('orders by blockOrder', () => {
    const sorted = sortContentBlocks(blocks, ['b', 'a'])
    expect(sorted.map((b) => b.id)).toEqual(['b', 'a'])
  })
})

describe('validateProductPageBlocks', () => {
  it('returns errors for invalid blocks', () => {
    const errors = validateProductPageBlocks([{ id: 'x', type: 'hero', data: {} }])
    expect(errors.length).toBeGreaterThan(0)
  })
})
