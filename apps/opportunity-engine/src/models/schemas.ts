import { z } from 'zod'

export const keywordDataSchema = z.object({
  term: z.string().min(1),
  searchVolume: z.number().int().nonnegative().optional(),
  competition: z.number().min(0).max(1).optional(),
  cpcLow: z.number().nonnegative().optional(),
  cpcHigh: z.number().nonnegative().optional(),
  relatedQuestions: z.array(z.string()).optional(),
})

export type KeywordData = z.infer<typeof keywordDataSchema>

export const opportunityScoreSchema = z.object({
  keyword: z.string(),
  category: z.string(),
  score: z.number().min(0).max(100),
  reasons: z.array(z.string()).min(1),
  estimatedCommission: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
})

export type OpportunityScore = z.infer<typeof opportunityScoreSchema>

export const opportunityScoreBatchSchema = z.object({
  opportunities: z.array(opportunityScoreSchema),
})

export const flowDefinitionSchema = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  nodes: z.array(
    z.object({
      nodeKey: z.string(),
      type: z.enum(['question_single', 'question_multi', 'info']),
      title: z.string(),
      isEntry: z.boolean().optional(),
      options: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
          }),
        )
        .optional(),
    }),
  ),
  rules: z.array(
    z.object({
      fromNodeKey: z.string(),
      targetNodeKey: z.string().optional(),
      targetResultKey: z.string().optional(),
      condition: z.record(z.unknown()).optional(),
    }),
  ),
  results: z.array(
    z.object({
      resultKey: z.string(),
      title: z.string(),
      body: z.string(),
      ctaLabel: z.string().optional(),
      ctaUrl: z.string().optional(),
    }),
  ),
})

export type FlowDefinition = z.infer<typeof flowDefinitionSchema>

export const discoverRequestSchema = z.object({
  seedCategories: z.array(z.string().min(1)).optional(),
  maxKeywordsPerCategory: z.number().int().min(1).max(50).default(10),
  autoGenerateFlows: z.number().int().min(0).max(20).optional(),
})

export const generateFlowsRequestSchema = z.object({
  limit: z.number().int().min(1).max(20).default(5),
  status: z.enum(['NEW', 'FLOW_GENERATED', 'PUBLISHED', 'REJECTED']).default('NEW'),
})

export const listOpportunitiesQuerySchema = z.object({
  status: z.enum(['NEW', 'FLOW_GENERATED', 'PUBLISHED', 'REJECTED']).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})
