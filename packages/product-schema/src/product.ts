import { z } from 'zod'

export const productStatusSchema = z.enum(['draft', 'published', 'archived'])
export const pageStatusSchema = z.enum(['draft', 'published', 'archived'])
export const contentBlockSourceSchema = z.enum(['manual', 'ai', 'opportunity', 'mixed'])

export const productSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  canonicalName: z.string().min(1),
  title: z.string().min(1),
  categorySlug: z.string().nullable().optional(),
  primaryFlowId: z.string().uuid().nullable().optional(),
  status: productStatusSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export type Product = z.infer<typeof productSchema>

export const productKeywordSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  term: z.string().min(1),
  source: z.enum(['manual', 'opportunity', 'seo']),
  opportunityId: z.string().optional(),
})

export type ProductKeyword = z.infer<typeof productKeywordSchema>
