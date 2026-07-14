import type { KeywordData, OpportunityScore } from '../models/schemas.js'
import { hashPrompt } from './hash.js'

export function keywordMetricsHash(keyword: KeywordData): string {
  return hashPrompt(
    JSON.stringify({
      term: keyword.term,
      searchVolume: keyword.searchVolume ?? null,
      competition: keyword.competition ?? null,
      cpcLow: keyword.cpcLow ?? null,
      cpcHigh: keyword.cpcHigh ?? null,
    }),
  )
}

export function isScoreCacheValid(
  lastScoredAt: Date | null,
  storedHash: string | null,
  keyword: KeywordData,
  ttlDays: number,
): boolean {
  if (!lastScoredAt || !storedHash) return false
  if (storedHash !== keywordMetricsHash(keyword)) return false

  const ageMs = Date.now() - lastScoredAt.getTime()
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000
  return ageMs < ttlMs
}

export function parseCachedScore(value: unknown): OpportunityScore | null {
  if (!value || typeof value !== 'object') return null
  const score = value as OpportunityScore
  if (typeof score.keyword !== 'string' || typeof score.score !== 'number') return null
  return score
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}
