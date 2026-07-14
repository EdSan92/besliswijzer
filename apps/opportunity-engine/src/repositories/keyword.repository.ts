import { Prisma, type Keyword } from '@prisma/client'
import { prisma } from '../database/prisma.js'
import type { KeywordData, OpportunityScore } from '../models/schemas.js'
import { keywordMetricsHash } from '../utils/score-cache.js'

export type ScoredKeyword = KeywordData & { id: string }

export class KeywordRepository {
  async upsert(term: string, data: KeywordData, categoryId?: string): Promise<Keyword> {
    const existing = await prisma.keyword.findFirst({
      where: { term, categoryId: categoryId ?? null },
    })

    const metricsHash = keywordMetricsHash(data)

    if (existing) {
      const metricsChanged = existing.metricsHash !== metricsHash
      return prisma.keyword.update({
        where: { id: existing.id },
        data: {
          searchVolume: data.searchVolume,
          competition: data.competition,
          cpcLow: data.cpcLow,
          cpcHigh: data.cpcHigh,
          relatedQuestions: data.relatedQuestions,
          metricsHash,
          ...(metricsChanged ? { cachedScore: Prisma.JsonNull, lastScoredAt: null } : {}),
        },
      })
    }

    return prisma.keyword.create({
      data: {
        term,
        categoryId,
        searchVolume: data.searchVolume,
        competition: data.competition,
        cpcLow: data.cpcLow,
        cpcHigh: data.cpcHigh,
        relatedQuestions: data.relatedQuestions,
        metricsHash,
      },
    })
  }

  async findByTerm(term: string): Promise<Keyword | null> {
    return prisma.keyword.findFirst({ where: { term } })
  }

  async findById(id: string): Promise<Keyword | null> {
    return prisma.keyword.findUnique({ where: { id } })
  }

  async saveCachedScore(keywordId: string, score: OpportunityScore, keyword: KeywordData): Promise<void> {
    await prisma.keyword.update({
      where: { id: keywordId },
      data: {
        cachedScore: score,
        lastScoredAt: new Date(),
        metricsHash: keywordMetricsHash(keyword),
      },
    })
  }
}
