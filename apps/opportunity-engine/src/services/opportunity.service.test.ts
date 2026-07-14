import { describe, expect, it, vi } from 'vitest'
import type { Opportunity } from '@prisma/client'
import type { OpportunityScore } from '../models/schemas.js'
import { OpportunityService } from './opportunity.service.js'

const sampleScore: OpportunityScore = {
  keyword: 'airfryer',
  category: 'Keuken',
  score: 85,
  reasons: ['Hoge koopintentie'],
  estimatedCommission: 25,
  confidence: 0.9,
}

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-1',
    keywordTerm: 'airfryer',
    categoryName: 'Keuken',
    score: 85,
    reasons: ['Hoge koopintentie'],
    estimatedCommission: 25,
    confidence: 0.9,
    status: 'NEW',
    flowDefinition: null,
    keywordId: 'kw-1',
    categoryId: 'cat-1',
    rejectedReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Opportunity
}

describe('OpportunityService', () => {
  it('skips duplicate opportunities', async () => {
    const opportunityRepo = {
      existsByKeywordAndCategory: vi.fn().mockResolvedValue(true),
      create: vi.fn(),
      findMany: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
      saveFlowDefinition: vi.fn(),
    }
    const service = new OpportunityService(opportunityRepo, {} as never, {} as never)

    const result = await service.storeOpportunity(sampleScore, 'kw-1', 'cat-1')
    expect(result).toBeNull()
    expect(opportunityRepo.create).not.toHaveBeenCalled()
  })

  it('stores new opportunities', async () => {
    const created = makeOpportunity()
    const opportunityRepo = {
      existsByKeywordAndCategory: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue(created),
      findMany: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
      saveFlowDefinition: vi.fn(),
    }
    const service = new OpportunityService(opportunityRepo, {} as never, {} as never)

    const result = await service.storeOpportunity(sampleScore, 'kw-1', 'cat-1')
    expect(result).toEqual(created)
    expect(opportunityRepo.create).toHaveBeenCalledWith({
      ...sampleScore,
      keywordId: 'kw-1',
      categoryId: 'cat-1',
    })
  })

  it('returns existing opportunity when flow is already generated', async () => {
    const existing = makeOpportunity({
      status: 'FLOW_GENERATED',
      flowDefinition: { title: 'Flow', slug: 'flow', description: 'd', nodes: [], rules: [], results: [] },
    })
    const opportunityRepo = {
      existsByKeywordAndCategory: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findById: vi.fn().mockResolvedValue(existing),
      updateStatus: vi.fn(),
      saveFlowDefinition: vi.fn(),
    }
    const aiProvider = { generateObject: vi.fn() }
    const promptBuilder = { generateFlow: vi.fn() }
    const service = new OpportunityService(opportunityRepo, {} as never, {} as never)

    const result = await service.generateFlow('opp-1', aiProvider as never, promptBuilder as never)
    expect(result).toEqual(existing)
    expect(aiProvider.generateObject).not.toHaveBeenCalled()
  })

  it('collects batch generation errors', async () => {
    const opportunityRepo = {
      existsByKeywordAndCategory: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      updateStatus: vi.fn(),
      saveFlowDefinition: vi.fn(),
    }
    const service = new OpportunityService(opportunityRepo, {} as never, {} as never)

    const result = await service.generateFlowsBatch(['missing'], {} as never, {} as never)
    expect(result.generated).toBe(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Opportunity not found')
  })
})
