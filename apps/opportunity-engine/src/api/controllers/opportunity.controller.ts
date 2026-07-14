import type { Request, Response } from 'express'
import { discoverRequestSchema, generateFlowsRequestSchema, listOpportunitiesQuerySchema } from '../../models/schemas.js'
import type { DiscoveryService } from '../../services/discovery.service.js'
import type { OpportunityScorer } from '../../services/opportunity-scorer.service.js'
import type { OpportunityService } from '../../services/opportunity.service.js'
import type { AIProvider } from '../../providers/ai/ai-provider.interface.js'
import type { PromptBuilder } from '../../services/prompt-builder.service.js'
import type { KeywordRepository } from '../../repositories/keyword.repository.js'

export class OpportunityController {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly opportunityService: OpportunityService,
    private readonly opportunityScorer: OpportunityScorer,
    private readonly aiProvider: AIProvider,
    private readonly promptBuilder: PromptBuilder,
    private readonly keywordRepo: KeywordRepository,
  ) {}

  discover = async (req: Request, res: Response): Promise<void> => {
    const body = discoverRequestSchema.parse(req.body ?? {})
    const result = await this.discoveryService.discover(body)
    res.status(202).json(result)
  }

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listOpportunitiesQuerySchema.parse(req.query)
    const opportunities = await this.opportunityService.list(query)
    res.json({ opportunities, count: opportunities.length })
  }

  score = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id)
    const opportunity = await this.opportunityService.getById(id)
    if (!opportunity) {
      res.status(404).json({ error: 'Opportunity not found' })
      return
    }

    const keyword = await this.keywordRepo.findByTerm(opportunity.keywordTerm)
    if (!keyword) {
      res.status(404).json({ error: 'Keyword not found' })
      return
    }

    const score = await this.opportunityScorer.scoreKeyword({
      term: keyword.term,
      searchVolume: keyword.searchVolume ?? undefined,
      competition: keyword.competition ?? undefined,
      cpcLow: keyword.cpcLow ?? undefined,
      cpcHigh: keyword.cpcHigh ?? undefined,
      relatedQuestions: (keyword.relatedQuestions as string[] | null) ?? undefined,
    })

    res.json({ score })
  }

  generateFlow = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id)
    const opportunity = await this.opportunityService.generateFlow(
      id,
      this.aiProvider,
      this.promptBuilder,
    )
    res.json({ opportunity })
  }

  generateFlows = async (req: Request, res: Response): Promise<void> => {
    const body = generateFlowsRequestSchema.parse(req.body ?? {})
    const candidates = await this.opportunityService.list({
      status: body.status,
      limit: body.limit,
      offset: 0,
    })
    const ids = candidates
      .filter((item) => item.status === 'NEW' || !item.flowDefinition)
      .map((item) => item.id)

    const result = await this.opportunityService.generateFlowsBatch(
      ids,
      this.aiProvider,
      this.promptBuilder,
    )

    res.json(result)
  }
}
