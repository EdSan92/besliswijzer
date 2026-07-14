import type { Opportunity, OpportunityStatus, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'
import type { FlowDefinition, OpportunityScore } from '../models/schemas.js'

export type CreateOpportunityInput = OpportunityScore & {
  keywordId: string
  categoryId?: string
}

export class OpportunityRepository {
  async findById(id: string): Promise<Opportunity | null> {
    return prisma.opportunity.findUnique({ where: { id } })
  }

  async findMany(params: {
    status?: OpportunityStatus
    minScore?: number
    limit: number
    offset: number
  }): Promise<Opportunity[]> {
    return prisma.opportunity.findMany({
      where: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.minScore !== undefined ? { score: { gte: params.minScore } } : {}),
      },
      orderBy: [{ score: 'desc' }, { discoveredAt: 'desc' }],
      take: params.limit,
      skip: params.offset,
    })
  }

  async existsByKeywordAndCategory(keywordTerm: string, categoryName: string): Promise<boolean> {
    const existing = await prisma.opportunity.findUnique({
      where: { keywordTerm_categoryName: { keywordTerm, categoryName } },
      select: { id: true },
    })
    return Boolean(existing)
  }

  async create(input: CreateOpportunityInput): Promise<Opportunity> {
    return prisma.opportunity.create({
      data: {
        keywordId: input.keywordId,
        categoryId: input.categoryId,
        keywordTerm: input.keyword,
        categoryName: input.category,
        score: input.score,
        confidence: input.confidence,
        estimatedCommission: input.estimatedCommission,
        reasons: input.reasons,
        status: 'NEW',
      },
    })
  }

  async updateStatus(
    id: string,
    status: OpportunityStatus,
    extra?: { rejectedReason?: string },
  ): Promise<Opportunity> {
    return prisma.opportunity.update({
      where: { id },
      data: { status, ...extra },
    })
  }

  async saveFlowDefinition(id: string, flow: FlowDefinition): Promise<Opportunity> {
    return prisma.opportunity.update({
      where: { id },
      data: {
        flowDefinition: flow as Prisma.InputJsonValue,
        status: 'FLOW_GENERATED',
      },
    })
  }

  async findNewWithoutFlow(limit: number): Promise<Opportunity[]> {
    return prisma.opportunity.findMany({
      where: { status: 'NEW' },
      orderBy: [{ score: 'desc' }, { discoveredAt: 'desc' }],
      take: limit,
    })
  }

  async countByStatus(): Promise<Record<OpportunityStatus, number>> {
    const groups = await prisma.opportunity.groupBy({
      by: ['status'],
      _count: { _all: true },
    })
    return {
      NEW: 0,
      FLOW_GENERATED: 0,
      PUBLISHED: 0,
      REJECTED: 0,
      ...Object.fromEntries(groups.map((g) => [g.status, g._count._all])),
    } as Record<OpportunityStatus, number>
  }
}
