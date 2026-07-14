import { getConfig } from '../../config/index.js'
import type { KeywordData } from '../../models/schemas.js'
import { RateLimiter } from '../../utils/rate-limiter.js'
import { logger } from '../../utils/logger.js'
import { withRetry } from '../../utils/retry.js'
import type { KeywordProvider, KeywordSearchResult } from './keyword-provider.interface.js'

type GoogleKeywordIdea = {
  text?: string
  keywordIdeaMetrics?: {
    avgMonthlySearches?: string
    competition?: string
    competitionIndex?: string
    lowTopOfPageBidMicros?: string
    highTopOfPageBidMicros?: string
  }
}

type GoogleKeywordResponse = {
  results?: GoogleKeywordIdea[]
  error?: { message?: string }
}

const MOCK_QUESTIONS: Record<string, string[]> = {
  default: [
    'Wat is het beste product?',
    'Welke merken zijn betrouwbaar?',
    'Wat kost het gemiddeld?',
    'Waar moet ik op letten bij aankoop?',
  ],
}

export class GoogleKeywordInsightProvider implements KeywordProvider {
  readonly name = 'google_keyword_insight'
  private readonly rateLimiter: RateLimiter

  constructor() {
    const config = getConfig()
    this.rateLimiter = new RateLimiter(config.KEYWORD_API_RATE_LIMIT_MS)
  }

  async searchKeyword(keyword: string): Promise<KeywordSearchResult> {
    const results = await this.searchMultiple([keyword])
    return results[0] ?? this.mockKeyword(keyword)
  }

  async searchMultiple(keywords: string[]): Promise<KeywordSearchResult[]> {
    const config = getConfig()

    if (config.GOOGLE_KEYWORD_INSIGHT_MOCK || !this.hasCredentials()) {
      logger.info({ keywords }, 'Using mock keyword insight data')
      return keywords.map((term) => this.mockKeyword(term))
    }

    return this.rateLimiter.throttle(async () =>
      withRetry(
        async () => {
          const response = await fetch(
            `https://googleads.googleapis.com/v19/customers/${config.GOOGLE_ADS_CUSTOMER_ID}:generateKeywordIdeas`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.GOOGLE_ADS_ACCESS_TOKEN}`,
                'developer-token': config.GOOGLE_ADS_DEVELOPER_TOKEN!,
                ...(config.GOOGLE_ADS_LOGIN_CUSTOMER_ID
                  ? { 'login-customer-id': config.GOOGLE_ADS_LOGIN_CUSTOMER_ID }
                  : {}),
              },
              body: JSON.stringify({
                keywordSeed: { keywords: keywords.slice(0, 20) },
                keywordPlanNetwork: 'GOOGLE_SEARCH',
                language: 'languageConstants/1010',
                geoTargetConstants: ['geoTargetConstants/2528'],
              }),
            },
          )

          const body = (await response.json()) as GoogleKeywordResponse
          if (!response.ok) {
            throw new Error(body.error?.message ?? `Keyword API HTTP ${response.status}`)
          }

          return (body.results ?? []).map((item) => this.mapGoogleResult(item))
        },
        {
          maxRetries: config.KEYWORD_API_MAX_RETRIES,
          onRetry: (attempt, error) => {
            logger.warn({ attempt, error }, 'Keyword API retry')
          },
        },
      ),
    )
  }

  async getQuestions(keyword: string): Promise<string[]> {
    const config = getConfig()
    if (config.GOOGLE_KEYWORD_INSIGHT_MOCK || !this.hasCredentials()) {
      return (MOCK_QUESTIONS[keyword.toLowerCase()] ?? MOCK_QUESTIONS.default).map((q) =>
        q.replace('product', keyword),
      )
    }

    const related = await this.searchKeyword(keyword)
    return related.relatedQuestions ?? MOCK_QUESTIONS.default
  }

  private hasCredentials(): boolean {
    const config = getConfig()
    return Boolean(
      config.GOOGLE_ADS_DEVELOPER_TOKEN &&
        config.GOOGLE_ADS_CUSTOMER_ID &&
        config.GOOGLE_ADS_ACCESS_TOKEN,
    )
  }

  private mapGoogleResult(item: GoogleKeywordIdea): KeywordSearchResult {
    const metrics = item.keywordIdeaMetrics
    return {
      term: item.text ?? 'unknown',
      searchVolume: metrics?.avgMonthlySearches ? Number(metrics.avgMonthlySearches) : undefined,
      competition: metrics?.competitionIndex ? Number(metrics.competitionIndex) / 100 : undefined,
      cpcLow: metrics?.lowTopOfPageBidMicros
        ? Number(metrics.lowTopOfPageBidMicros) / 1_000_000
        : undefined,
      cpcHigh: metrics?.highTopOfPageBidMicros
        ? Number(metrics.highTopOfPageBidMicros) / 1_000_000
        : undefined,
      relatedQuestions: [],
      source: this.name,
    }
  }

  private mockKeyword(term: string): KeywordSearchResult {
    const base: KeywordData = {
      term,
      searchVolume: 1000 + term.length * 100,
      competition: 0.45,
      cpcLow: 0.35,
      cpcHigh: 1.2,
      relatedQuestions: MOCK_QUESTIONS.default.map((q) => `${q} (${term})`),
    }
    return { ...base, source: 'mock' }
  }
}

