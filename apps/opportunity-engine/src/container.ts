import { ZodError } from 'zod'
import { getConfig } from './config/index.js'
import { GeminiProvider } from './providers/ai/gemini.provider.js'
import { OpenAIProvider } from './providers/ai/openai.provider.js'
import type { AIProvider } from './providers/ai/ai-provider.interface.js'
import { GoogleKeywordInsightProvider } from './providers/keywords/google-keyword-insight.provider.js'
import type { KeywordProvider } from './providers/keywords/keyword-provider.interface.js'
import { OpportunityController } from './api/controllers/opportunity.controller.js'
import { StatisticsController } from './api/controllers/statistics.controller.js'
import { AiCallRepository } from './repositories/ai-call.repository.js'
import { CategoryRepository } from './repositories/category.repository.js'
import { DiscoveryRunRepository } from './repositories/discovery-run.repository.js'
import { KeywordRepository } from './repositories/keyword.repository.js'
import { OpportunityRepository } from './repositories/opportunity.repository.js'
import { PromptLogRepository } from './repositories/prompt-log.repository.js'
import { DiscoveryService } from './services/discovery.service.js'
import { OpportunityScorer } from './services/opportunity-scorer.service.js'
import { OpportunityService } from './services/opportunity.service.js'
import { PromptBuilder } from './services/prompt-builder.service.js'
import { StatisticsService } from './services/statistics.service.js'

export type AppContainer = {
  aiProvider: AIProvider
  keywordProvider: KeywordProvider
  opportunityController: OpportunityController
  statisticsController: StatisticsController
  discoveryService: DiscoveryService
}

export function createContainer(): AppContainer {
  const promptLogRepo = new PromptLogRepository()
  const aiCallRepo = new AiCallRepository()
  const opportunityRepo = new OpportunityRepository()
  const keywordRepo = new KeywordRepository()
  const categoryRepo = new CategoryRepository()
  const discoveryRunRepo = new DiscoveryRunRepository()

  const config = getConfig()
  const aiProvider: AIProvider =
    config.AI_PROVIDER === 'openai'
      ? new OpenAIProvider(promptLogRepo, aiCallRepo)
      : new GeminiProvider(promptLogRepo, aiCallRepo)

  const keywordProvider: KeywordProvider = new GoogleKeywordInsightProvider()
  const promptBuilder = new PromptBuilder('Veraio')

  const opportunityScorer = new OpportunityScorer(aiProvider, promptBuilder, keywordRepo)
  const opportunityService = new OpportunityService(opportunityRepo, keywordRepo, categoryRepo)
  const discoveryService = new DiscoveryService(
    categoryRepo,
    keywordRepo,
    keywordProvider,
    opportunityScorer,
    opportunityService,
    promptBuilder,
    aiProvider,
    discoveryRunRepo,
  )
  const statisticsService = new StatisticsService(opportunityRepo, aiCallRepo, discoveryRunRepo)

  const opportunityController = new OpportunityController(
    discoveryService,
    opportunityService,
    opportunityScorer,
    aiProvider,
    promptBuilder,
    keywordRepo,
  )
  const statisticsController = new StatisticsController(statisticsService)

  return {
    aiProvider,
    keywordProvider,
    opportunityController,
    statisticsController,
    discoveryService,
  }
}

export function formatError(error: unknown): { status: number; message: string } {
  if (error instanceof ZodError) {
    return { status: 400, message: error.errors.map((e) => e.message).join(', ') }
  }
  if (error instanceof Error) {
    return { status: 500, message: error.message }
  }
  return { status: 500, message: 'Internal server error' }
}
