import { getConfig } from '../config/index.js'
import type { KeywordData, OpportunityScore } from '../models/schemas.js'
import { opportunityScoreBatchSchema, opportunityScoreSchema } from '../models/schemas.js'
import type { AIProvider } from '../providers/ai/ai-provider.interface.js'
import { isExcludedHighConsiderationProduct } from '../utils/product-focus.js'
import { logger } from '../utils/logger.js'
import {
  chunkArray,
  isScoreCacheValid,
  parseCachedScore,
} from '../utils/score-cache.js'
import type { KeywordRepository, ScoredKeyword } from '../repositories/keyword.repository.js'
import type { PromptBuilder } from './prompt-builder.service.js'

export type ScoreKeywordsResult = {
  scores: OpportunityScore[]
  fromCache: number
  fromApi: number
  apiBatches: number
}

export class OpportunityScorer {
  constructor(
    private readonly aiProvider: AIProvider,
    private readonly promptBuilder: PromptBuilder,
    private readonly keywordRepo: KeywordRepository,
  ) {}

  async scoreKeyword(keyword: KeywordData): Promise<OpportunityScore | null> {
    const results = await this.scoreKeywords([{ ...keyword, id: 'single' }])
    return results.scores[0] ?? null
  }

  async scoreKeywords(keywords: ScoredKeyword[]): Promise<ScoreKeywordsResult> {
    const config = getConfig()
    const minScore = config.OPPORTUNITY_MIN_SCORE
    const batchSize = config.SCORE_BATCH_SIZE
    const ttlDays = config.SCORE_CACHE_TTL_DAYS

    const scores: OpportunityScore[] = []
    const toScore: ScoredKeyword[] = []
    let fromCache = 0

    for (const keyword of keywords) {
      if (isExcludedHighConsiderationProduct(keyword.term)) continue

      if (keyword.id !== 'single') {
        const record = await this.keywordRepo.findById(keyword.id)
        if (
          record &&
          isScoreCacheValid(record.lastScoredAt, record.metricsHash, keyword, ttlDays)
        ) {
          const cached = parseCachedScore(record.cachedScore)
          if (cached && cached.score >= minScore && !isExcludedHighConsiderationProduct(cached.keyword, cached.category)) {
            scores.push(cached)
            fromCache++
            continue
          }
        }
      }

      toScore.push(keyword)
    }

    const batches = chunkArray(toScore, batchSize)
    let fromApi = 0

    for (const batch of batches) {
      const batchScores = await this.scoreBatch(batch, minScore)
      scores.push(...batchScores)
      fromApi += batchScores.length

      for (const score of batchScores) {
        const keyword = batch.find(
          (item) => item.term.toLowerCase() === score.keyword.toLowerCase(),
        )
        if (keyword && keyword.id !== 'single') {
          await this.keywordRepo.saveCachedScore(keyword.id, score, keyword)
        }
      }
    }

    logger.info(
      { fromCache, fromApi, apiBatches: batches.length, total: scores.length },
      'Keywords scored',
    )

    return {
      scores,
      fromCache,
      fromApi,
      apiBatches: batches.length,
    }
  }

  private async scoreBatch(batch: ScoredKeyword[], minScore: number): Promise<OpportunityScore[]> {
    if (batch.length === 0) return []

    if (batch.length === 1) {
      const keyword = batch[0]
      const prompt = this.promptBuilder.scoreKeyword({
        keyword: keyword.term,
        searchVolume: keyword.searchVolume,
        competition: keyword.competition,
        cpcLow: keyword.cpcLow,
        cpcHigh: keyword.cpcHigh,
        relatedQuestions: keyword.relatedQuestions,
      })

      const { data } = await this.aiProvider.generateObject(opportunityScoreSchema, prompt, {
        promptName: 'score-keyword',
      })

      return this.filterScore(data, minScore)
    }

    const prompt = this.promptBuilder.scoreKeywordsBatch(batch)
    const { data } = await this.aiProvider.generateObject(opportunityScoreBatchSchema, prompt, {
      promptName: 'score-keywords-batch',
    })

    const results: OpportunityScore[] = []
    for (const item of data.opportunities) {
      results.push(...this.filterScore(item, minScore))
    }
    return results
  }

  private filterScore(data: OpportunityScore, minScore: number): OpportunityScore[] {
    if (data.score < minScore) return []
    if (isExcludedHighConsiderationProduct(data.keyword, data.category)) return []
    return [data]
  }
}
