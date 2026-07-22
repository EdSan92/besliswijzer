import { z } from 'zod'
import {
  normalizeProductPageContentRaw,
  PRODUCT_PAGE_FAQ_MAX,
  PRODUCT_PAGE_FAQ_MIN,
} from './product-page-content.js'

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

export const faqItemSchema = z.object({
  question: z.string().min(5),
  answer: z.string().min(20),
})

export type FaqItem = z.infer<typeof faqItemSchema>

export const routeOpportunityRequestSchema = z.object({
  pageSlug: z.string().min(2),
  faqItem: faqItemSchema,
})

export const discoverRequestSchema = z.object({
  seedCategories: z.array(z.string().min(1)).optional(),
  maxKeywordsPerCategory: z.number().int().min(1).max(50).default(10),
  autoGenerateFlows: z.number().int().min(0).max(20).optional(),
  autoRouteFaq: z.number().int().min(0).max(20).optional(),
})

export const generateFlowsRequestSchema = z.object({
  limit: z.number().int().min(1).max(20).default(5),
  status: z.enum(['NEW', 'FLOW_GENERATED', 'PUBLISHED', 'REJECTED']).default('NEW'),
})

export const listOpportunitiesQuerySchema = z.object({
  status: z
    .enum(['NEW', 'FLOW_GENERATED', 'PUBLISHED', 'REJECTED', 'ROUTED_TO_PRODUCT'])
    .optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

const productPageContentObjectSchema = z.object({
  pageTitle: z.string().min(1),
  pageSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  seo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
  hero: z.object({
    headline: z.string().min(1),
    subheadline: z.string().optional(),
    badges: z.array(z.string()).optional(),
  }),
  intro: z.object({
    title: z.string().optional(),
    body: z.string().min(1),
  }),
  faqItems: z.array(faqItemSchema).min(PRODUCT_PAGE_FAQ_MIN).max(PRODUCT_PAGE_FAQ_MAX),
})

export const productPageContentSchema = z.preprocess(
  normalizeProductPageContentRaw,
  productPageContentObjectSchema,
)

export type ProductPageContent = z.infer<typeof productPageContentSchema>

export const contentKeywordSchema = z.object({
  term: z.string().min(1),
  opportunityId: z.string().optional(),
  score: z.number().optional(),
  categoryName: z.string().optional(),
})

export type ContentKeyword = z.infer<typeof contentKeywordSchema>

export const generateProductPageRequestSchema = z.object({
  productSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  productTitle: z.string().min(1),
  canonicalName: z.string().min(1),
  categoryTitle: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  flowId: z.string().uuid(),
  flowSlug: z.string().min(2),
  flowTitle: z.string().min(1),
  pageSlug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  seedKeywords: z.array(z.string().min(1)).optional(),
  contentKeywords: z.array(contentKeywordSchema).optional(),
  publish: z.boolean().default(false),
})

export const regenerateProductPageRequestSchema = generateProductPageRequestSchema.extend({
  pageSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
})

export type RegenerateProductPageRequest = z.infer<typeof regenerateProductPageRequestSchema>

export const generateProductFlowRequestSchema = z.object({
  productSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  productTitle: z.string().min(1),
  canonicalName: z.string().min(1),
  categoryTitle: z.string().min(1),
  flowSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  keywords: z.array(z.string().min(1)).min(1),
})

export type GenerateProductFlowRequest = z.infer<typeof generateProductFlowRequestSchema>
