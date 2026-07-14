import type { Opportunity, OpportunityStatus } from '@prisma/client'
import type { FlowDefinition, OpportunityScore } from '../models/schemas.js'
import { flowDefinitionSchema } from '../models/schemas.js'
import type { AIProvider } from '../providers/ai/ai-provider.interface.js'
import { logger } from '../utils/logger.js'
import type { CategoryRepository } from '../repositories/category.repository.js'
import type { KeywordRepository } from '../repositories/keyword.repository.js'
import type { OpportunityRepository } from '../repositories/opportunity.repository.js'
import type { PromptBuilder } from './prompt-builder.service.js'

export class OpportunityService {
  constructor(
    private readonly opportunityRepo: OpportunityRepository,
    private readonly keywordRepo: KeywordRepository,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  async list(params: {
    status?: OpportunityStatus
    minScore?: number
    limit: number
    offset: number
  }): Promise<Opportunity[]> {
    return this.opportunityRepo.findMany(params)
  }

  async getById(id: string): Promise<Opportunity | null> {
    return this.opportunityRepo.findById(id)
  }

  async storeOpportunity(
    score: OpportunityScore,
    keywordId: string,
    categoryId?: string,
  ): Promise<Opportunity | null> {
    const exists = await this.opportunityRepo.existsByKeywordAndCategory(score.keyword, score.category)
    if (exists) {
      logger.debug({ keyword: score.keyword, category: score.category }, 'Duplicate opportunity skipped')
      return null
    }

    return this.opportunityRepo.create({
      ...score,
      keywordId,
      categoryId,
    })
  }

  async reject(id: string, reason: string): Promise<Opportunity> {
    return this.opportunityRepo.updateStatus(id, 'REJECTED', { rejectedReason: reason })
  }

  async markPublished(id: string): Promise<Opportunity> {
    return this.opportunityRepo.updateStatus(id, 'PUBLISHED')
  }

  async generateFlow(
    id: string,
    aiProvider: AIProvider,
    promptBuilder: PromptBuilder,
  ): Promise<Opportunity> {
    const opportunity = await this.opportunityRepo.findById(id)
    if (!opportunity) throw new Error('Opportunity not found')
    if (opportunity.status === 'FLOW_GENERATED' && opportunity.flowDefinition) {
      return opportunity
    }

    const score: OpportunityScore = {
      keyword: opportunity.keywordTerm,
      category: opportunity.categoryName,
      score: opportunity.score,
      reasons: opportunity.reasons as string[],
      estimatedCommission: opportunity.estimatedCommission ?? 0,
      confidence: opportunity.confidence,
    }

    const prompt = promptBuilder.generateFlow(score)
    const { data } = await aiProvider.generateObject(flowDefinitionSchema, prompt, {
      promptName: 'generate-flow',
    })

    return this.opportunityRepo.saveFlowDefinition(id, data as FlowDefinition)
  }

  async generateFlowsBatch(
    ids: string[],
    aiProvider: AIProvider,
    promptBuilder: PromptBuilder,
  ): Promise<{ generated: number; errors: string[] }> {
    const errors: string[] = []
    let generated = 0

    for (const id of ids) {
      try {
        await this.generateFlow(id, aiProvider, promptBuilder)
        generated++
        logger.info({ opportunityId: id }, 'Flow generated')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${id}: ${message}`)
        logger.error({ opportunityId: id, error }, 'Flow generation failed')
      }
    }

    return { generated, errors }
  }

  async resolveCategoryId(categoryName: string): Promise<string | undefined> {
    const category = await this.categoryRepo.findByName(categoryName)
    return category?.id
  }

  async linkKeyword(term: string, categoryId?: string) {
    return this.keywordRepo.findByTerm(term)
  }
}
