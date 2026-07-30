import { KeywordResearchError } from '../errors.js'
import { logKeywordProviderMetrics, type KeywordCallMetrics } from '../provider-metrics.js'
import { RateLimiter } from '../utils/rate-limiter.js'
import { withRetry } from '../utils/retry.js'
import type { GoogleKeywordInsightConfig } from '../config.js'
import type {
  KeywordResearchProvider,
  KeywordResearchProviderResult,
  KeywordResearchRequest,
} from '../types.js'

type GoogleKeywordIdea = {
  text?: string
  keywordIdeaMetrics?: {
    avgMonthlySearches?: string
    competitionIndex?: string
    lowTopOfPageBidMicros?: string
    highTopOfPageBidMicros?: string
  }
}

type GoogleKeywordResponse = {
  results?: GoogleKeywordIdea[]
  error?: { message?: string }
}

const MOCK_QUESTIONS = [
  'Wat is het beste product?',
  'Welke merken zijn betrouwbaar?',
  'Wat kost het gemiddeld?',
  'Waar moet ik op letten bij aankoop?',
]

export class GoogleKeywordInsightProvider implements KeywordResearchProvider {
  readonly name = 'google_keyword_insight'
  private readonly config: GoogleKeywordInsightConfig
  private readonly rateLimiter: RateLimiter
  private readonly fetchImpl: typeof fetch

  constructor(config: GoogleKeywordInsightConfig) {
    this.config = config
    this.rateLimiter = new RateLimiter(config.rateLimitMs ?? 1100)
    this.fetchImpl = config.fetchImpl ?? fetch
  }

  async research(request: KeywordResearchRequest): Promise<KeywordResearchProviderResult> {
    const keywords = [
      request.primaryKeyword,
      ...(request.seedVariants ?? []),
    ].filter((value, index, array) => array.indexOf(value) === index)

    if (this.config.mock || !this.hasCredentials()) {
      return this.mockResult(request.primaryKeyword, keywords)
    }

    const started = Date.now()
    let retryCount = 0

    const ideas = await this.rateLimiter.throttle(() =>
      withRetry(() => this.fetchKeywordIdeas(keywords), {
        maxRetries: this.config.maxRetries ?? 3,
        onRetry: () => {
          retryCount += 1
        },
      }),
    )

    const variants = ideas.map((idea) => this.mapVariant(idea))
    const primaryVariant =
      variants.find((variant) => variant.term === request.primaryKeyword) ?? variants[0]

    if (!primaryVariant) {
      throw new KeywordResearchError(
        'Provider returned no keyword variants',
        'INVALID_RESPONSE',
        this.name,
        false,
      )
    }

    const metrics: KeywordCallMetrics = {
      provider: this.name,
      operation: 'research',
      primaryKeywordLength: request.primaryKeyword.length,
      variantCount: variants.length,
      latencyMs: Date.now() - started,
      retryCount,
    }
    logKeywordProviderMetrics(metrics)
    this.config.onMetrics?.(metrics)

    return {
      primaryKeyword: request.primaryKeyword,
      variants,
      questions: this.buildQuestions(request.primaryKeyword),
      searchIntent: 'commercial',
      limitations: ['search intent inferred from keyword research context'],
    }
  }

  mapVariant(idea: GoogleKeywordIdea) {
    const metrics = idea.keywordIdeaMetrics
    return {
      term: idea.text ?? 'unknown',
      searchVolume: metrics?.avgMonthlySearches
        ? Number(metrics.avgMonthlySearches)
        : undefined,
      competition: metrics?.competitionIndex
        ? Number(metrics.competitionIndex) / 100
        : undefined,
      cpcLow: metrics?.lowTopOfPageBidMicros
        ? Number(metrics.lowTopOfPageBidMicros) / 1_000_000
        : undefined,
      cpcHigh: metrics?.highTopOfPageBidMicros
        ? Number(metrics.highTopOfPageBidMicros) / 1_000_000
        : undefined,
    }
  }

  mapGoogleResponse(body: GoogleKeywordResponse) {
    return (body.results ?? []).map((idea) => this.mapVariant(idea))
  }

  private async fetchKeywordIdeas(keywords: string[]): Promise<GoogleKeywordIdea[]> {
    const timeoutMs = this.config.timeoutMs ?? 15_000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await this.fetchImpl(
        `https://googleads.googleapis.com/v19/customers/${this.config.customerId}:generateKeywordIdeas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.accessToken}`,
            'developer-token': this.config.developerToken!,
            ...(this.config.loginCustomerId
              ? { 'login-customer-id': this.config.loginCustomerId }
              : {}),
          },
          body: JSON.stringify({
            keywordSeed: { keywords: keywords.slice(0, 20) },
            keywordPlanNetwork: 'GOOGLE_SEARCH',
            language: 'languageConstants/1010',
            geoTargetConstants: ['geoTargetConstants/2528'],
          }),
          signal: controller.signal,
        },
      )

      const body = (await response.json()) as GoogleKeywordResponse
      if (!response.ok) {
        const message = body.error?.message ?? `Keyword API HTTP ${response.status}`
        if (response.status === 429 || message.toLowerCase().includes('rate limit')) {
          throw new KeywordResearchError(message, 'PROVIDER_RATE_LIMIT', this.name, true)
        }
        if (response.status === 401 || response.status === 403) {
          throw new KeywordResearchError(message, 'PROVIDER_ERROR', this.name, false)
        }
        throw new KeywordResearchError(message, 'PROVIDER_ERROR', this.name, response.status >= 500)
      }

      return body.results ?? []
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new KeywordResearchError(
          `Keyword provider timed out after ${timeoutMs}ms`,
          'PROVIDER_TIMEOUT',
          this.name,
          true,
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private hasCredentials(): boolean {
    return Boolean(
      this.config.developerToken &&
        this.config.customerId &&
        this.config.accessToken,
    )
  }

  private mockResult(primaryKeyword: string, keywords: string[]): KeywordResearchProviderResult {
    return {
      primaryKeyword,
      variants: keywords.map((term, index) => ({
        term,
        searchVolume: 1000 + term.length * 100 + index * 50,
        competition: 0.45,
        cpcLow: 0.35,
        cpcHigh: 1.2,
      })),
      questions: this.buildQuestions(primaryKeyword),
      searchIntent: 'commercial',
      limitations: ['mock provider response'],
    }
  }

  private buildQuestions(keyword: string): string[] {
    return MOCK_QUESTIONS.map((question) => question.replace('product', keyword))
  }
}
