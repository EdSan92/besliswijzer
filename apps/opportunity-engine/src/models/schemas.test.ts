import { describe, expect, it } from 'vitest'
import {
  discoverRequestSchema,
  generateFlowsRequestSchema,
  listOpportunitiesQuerySchema,
} from '../models/schemas.js'

describe('opportunity request schemas', () => {
  it('applies discover defaults', () => {
    const parsed = discoverRequestSchema.parse({})
    expect(parsed.maxKeywordsPerCategory).toBe(10)
  })

  it('validates generate flows request defaults', () => {
    const parsed = generateFlowsRequestSchema.parse({})
    expect(parsed.limit).toBe(5)
    expect(parsed.status).toBe('NEW')
  })

  it('coerces list query parameters', () => {
    const parsed = listOpportunitiesQuerySchema.parse({
      minScore: '70',
      limit: '10',
      offset: '5',
    })
    expect(parsed.minScore).toBe(70)
    expect(parsed.limit).toBe(10)
    expect(parsed.offset).toBe(5)
  })
})
