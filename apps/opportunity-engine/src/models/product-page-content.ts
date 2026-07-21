import { z } from 'zod'

export const PRODUCT_PAGE_FAQ_MIN = 2
export const PRODUCT_PAGE_FAQ_MAX = 8

export function resolveProductPageFaqCount(keywordCount: number): { min: number; max: number } {
  if (keywordCount <= 0) {
    return { min: 4, max: 6 }
  }

  const min = Math.min(Math.max(keywordCount, 4), PRODUCT_PAGE_FAQ_MAX)
  const max = Math.min(Math.max(keywordCount + 2, 6), PRODUCT_PAGE_FAQ_MAX)

  return { min: Math.min(min, max), max }
}

export function normalizeProductPageContentRaw(data: unknown): unknown {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return data
  }

  const record = data as Record<string, unknown>
  const faqItems = record.faqItems

  if (!Array.isArray(faqItems) || faqItems.length <= PRODUCT_PAGE_FAQ_MAX) {
    return data
  }

  return {
    ...record,
    faqItems: faqItems.slice(0, PRODUCT_PAGE_FAQ_MAX),
  }
}

export const faqItemSchema = z.object({
  question: z.string().min(5),
  answer: z.string().min(20),
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

export type GenerateProductPageRequest = z.infer<typeof generateProductPageRequestSchema>

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
