import { z } from 'zod'
import { getConfig } from '../config/index.js'
import { isExcludedHighConsiderationProduct } from '../utils/product-focus.js'
import type { KeywordData } from '../models/schemas.js'
import type { AIProvider } from '../providers/ai/ai-provider.interface.js'
import type { KeywordProvider } from '../providers/keywords/keyword-provider.interface.js'
import type { CategoryRepository } from '../repositories/category.repository.js'
import type { DiscoveryRunRepository } from '../repositories/discovery-run.repository.js'
import type { KeywordRepository, ScoredKeyword } from '../repositories/keyword.repository.js'
import { logger } from '../utils/logger.js'
import { FlowStepTracker } from '../utils/flow-step-tracker.js'
import type { FlowStep } from '../utils/flow-step-tracker.js'
import type { OpportunityScorer } from './opportunity-scorer.service.js'
import type { OpportunityService } from './opportunity.service.js'
import type { PromptBuilder } from './prompt-builder.service.js'

const seedKeywordsSchema = z.object({
  keywords: z.array(z.string().min(1)),
})

export type DiscoveryResult = {
  seedCategories: number
  keywordsCollected: number
  opportunitiesFound: number
  opportunitiesStored: number
  flowsGenerated: number
  scoresFromCache: number
  scoresFromApi: number
  apiBatches: number
  durationMs: number
  errors: string[]
  steps: FlowStep[]
}

export class DiscoveryService {
  constructor(
    private readonly categoryRepo: CategoryRepository,
    private readonly keywordRepo: KeywordRepository,
    private readonly keywordProvider: KeywordProvider,
    private readonly opportunityScorer: OpportunityScorer,
    private readonly opportunityService: OpportunityService,
    private readonly promptBuilder: PromptBuilder,
    private readonly aiProvider: AIProvider,
    private readonly discoveryRunRepo: DiscoveryRunRepository,
  ) {}

  async discover(options?: {
    seedCategories?: string[]
    maxKeywordsPerCategory?: number
    autoGenerateFlows?: number
  }): Promise<DiscoveryResult> {
    const start = Date.now()
    const errors: string[] = []
    const maxKeywords = options?.maxKeywordsPerCategory ?? 10
    const tracker = new FlowStepTracker()

    tracker.start('load-seeds', 'Seed categorieën laden')

    const seeds = options?.seedCategories?.length
      ? await this.resolveSeedCategories(options.seedCategories)
      : await this.categoryRepo.findSeedCategories()

    tracker.complete('load-seeds', `${seeds.length} webshop-categorieën geladen`)

    logger.info({ seedCount: seeds.length }, 'Starting opportunity discovery')

    tracker.start('collect-keywords', 'Keywords verzamelen per categorie')

    const allKeywords: ScoredKeyword[] = []
    const categoryNames: string[] = []

    for (const category of seeds) {
      try {
        const keywords = await this.collectKeywordsForCategory(category.name, maxKeywords)
        categoryNames.push(category.name)
        for (const kw of keywords) {
          const saved = await this.keywordRepo.upsert(kw.term, kw, category.id)
          allKeywords.push({
            id: saved.id,
            term: saved.term,
            searchVolume: saved.searchVolume ?? undefined,
            competition: saved.competition ?? undefined,
            cpcLow: saved.cpcLow ?? undefined,
            cpcHigh: saved.cpcHigh ?? undefined,
            relatedQuestions: (saved.relatedQuestions as string[] | null) ?? undefined,
          })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Category ${category.name}: ${message}`)
        logger.error({ category: category.name, error }, 'Category discovery failed')
      }
    }

    tracker.complete(
      'collect-keywords',
      `${allKeywords.length} keywords uit ${categoryNames.length} categorieën (${categoryNames.slice(0, 3).join(', ')}${categoryNames.length > 3 ? '…' : ''})`,
    )

    tracker.start('score-keywords', 'Keywords scoren (batch + cache)')

    const scoreResult = await this.opportunityScorer.scoreKeywords(allKeywords)
    const scores = scoreResult.scores

    tracker.complete(
      'score-keywords',
      `${scores.length} kansen · ${scoreResult.fromCache} uit cache · ${scoreResult.apiBatches} API-batches`,
    )

    tracker.start('store-opportunities', 'Opportunities opslaan')
    let stored = 0
    const createdOpportunities: Array<{ id: string; score: number }> = []

    for (const score of scores) {
      try {
        const keyword = await this.keywordRepo.findByTerm(score.keyword)
        if (!keyword) continue

        const categoryId = await this.opportunityService.resolveCategoryId(score.category)
        const created = await this.opportunityService.storeOpportunity(score, keyword.id, categoryId)
        if (created) {
          stored++
          createdOpportunities.push({ id: created.id, score: created.score })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Store ${score.keyword}: ${message}`)
      }
    }

    tracker.complete('store-opportunities', `${stored} nieuwe opportunities opgeslagen`)

    const autoGenerateLimit =
      options?.autoGenerateFlows ?? getConfig().DISCOVERY_AUTO_GENERATE_FLOWS
    let flowsGenerated = 0

    tracker.start('generate-flows', 'Beslis-flows genereren')

    if (autoGenerateLimit > 0 && createdOpportunities.length > 0) {
      const topIds = createdOpportunities
        .sort((a, b) => b.score - a.score)
        .slice(0, autoGenerateLimit)
        .map((item) => item.id)

      const flowResult = await this.opportunityService.generateFlowsBatch(
        topIds,
        this.aiProvider,
        this.promptBuilder,
      )
      flowsGenerated = flowResult.generated
      errors.push(...flowResult.errors.map((e) => `Flow ${e}`))
    }

    tracker.complete(
      'generate-flows',
      autoGenerateLimit > 0
        ? `${flowsGenerated} flows gegenereerd (top ${autoGenerateLimit})`
        : 'Overgeslagen (auto-generatie uit)',
    )

    tracker.start('save-run', 'Discovery-run opslaan')

    const result: DiscoveryResult = {
      seedCategories: seeds.length,
      keywordsCollected: allKeywords.length,
      opportunitiesFound: scores.length,
      opportunitiesStored: stored,
      flowsGenerated,
      scoresFromCache: scoreResult.fromCache,
      scoresFromApi: scoreResult.fromApi,
      apiBatches: scoreResult.apiBatches,
      durationMs: Date.now() - start,
      errors,
      steps: tracker.getSteps(),
    }

    await this.discoveryRunRepo.create(result)
    tracker.complete('save-run', `Klaar in ${(result.durationMs / 1000).toFixed(1)}s`)
    result.steps = tracker.getSteps()
    logger.info(result, 'Discovery completed')

    return result
  }

  private async resolveSeedCategories(names: string[]) {
    const categories = []
    for (const name of names) {
      const existing = await this.categoryRepo.findByName(name)
      if (existing) categories.push(existing)
    }
    return categories
  }

  private async collectKeywordsForCategory(categoryName: string, max: number): Promise<KeywordData[]> {
    const config = getConfig()

    let seedTerms: string[] = []
    if (config.GOOGLE_KEYWORD_INSIGHT_MOCK || !this.hasGoogleCredentials()) {
      const prompt = this.promptBuilder.discoverSeed(categoryName)
      const { data } = await this.aiProvider.generateObject(seedKeywordsSchema, prompt, {
        promptName: 'discover-seed',
      })
      seedTerms = data.keywords.slice(0, max)
    } else {
      seedTerms = [
        `beste ${categoryName}`,
        `${categoryName} kopen`,
        `${categoryName} vergelijken`,
        `goedkope ${categoryName}`,
      ]
    }

    const results = await this.keywordProvider.searchMultiple(seedTerms.slice(0, max))

    const enriched: KeywordData[] = []
    for (const result of results.slice(0, max)) {
      if (isExcludedHighConsiderationProduct(result.term)) continue
      const questions = await this.keywordProvider.getQuestions(result.term)
      enriched.push({ ...result, relatedQuestions: questions })
    }

    return enriched
  }

  private hasGoogleCredentials(): boolean {
    const config = getConfig()
    return Boolean(
      config.GOOGLE_ADS_DEVELOPER_TOKEN &&
        config.GOOGLE_ADS_CUSTOMER_ID &&
        config.GOOGLE_ADS_ACCESS_TOKEN,
    )
  }
}
