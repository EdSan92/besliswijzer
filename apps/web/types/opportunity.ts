import type { OpportunityFlowDefinition } from '~/types/opportunity-flow'

export type FlowStep = {
  id: string
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
  detail?: string
  timestamp: string
  durationMs?: number
}

export type DiscoveryResult = {
  seedCategories: number
  keywordsCollected: number
  opportunitiesFound: number
  opportunitiesStored: number
  flowsGenerated: number
  faqsRouted: number
  faqsSkipped: number
  scoresFromCache: number
  scoresFromApi: number
  apiBatches: number
  durationMs: number
  errors: string[]
  steps: FlowStep[]
}

export type OpportunityItem = {
  id: string
  keywordTerm: string
  categoryName: string
  score: number
  confidence: number
  estimatedCommission: number | null
  status: 'NEW' | 'FLOW_GENERATED' | 'PUBLISHED' | 'REJECTED' | 'ROUTED_TO_PRODUCT'
  flowDefinition?: OpportunityFlowDefinition | null
  faqItem?: { question: string; answer: string } | null
  routedPageSlug?: string | null
  discoveredAt: string
}

export type GenerateProductPageResult = {
  productId: string
  pageId: string
  pageSlug: string
  status: string
}

export type OpportunityStatistics = {
  opportunities: Record<string, number>
  ai: {
    total: number
    success: number
    failed: number
    avgLatencyMs: number
    inputTokens: number
    outputTokens: number
  }
  recentDiscoveryRuns: Array<{
    id: string
    seedCategories: number
    keywordsCollected: number
    opportunitiesFound: number
    opportunitiesStored: number
    durationMs: number
    createdAt: string
  }>
}
