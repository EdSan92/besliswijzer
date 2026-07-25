import { z } from 'zod'
import { contentBlockSchema, type ContentBlock } from './content-block.js'
import { pageStatusSchema, productSchema } from './product.js'

const canonicalUrlSchema = z
  .string()
  .refine((value) => value.startsWith('/') || /^https?:\/\//.test(value), {
    message: 'canonicalUrl must be an absolute URL or root-relative path',
  })

export const pageSeoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  canonicalUrl: canonicalUrlSchema.optional(),
  ogImage: z.string().optional(),
  twitterCard: z.enum(['summary', 'summary_large_image']).optional(),
  noindex: z.boolean().optional(),
})

export const pageLayoutSchema = z.object({
  blockOrder: z.array(z.string()).default([]),
  templateId: z.string().optional(),
})

export const productPageSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  status: pageStatusSchema,
  seo: pageSeoSchema,
  layout: pageLayoutSchema,
  contentBlocks: z.array(contentBlockSchema),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export type PageSEO = z.infer<typeof pageSeoSchema>
export type PageLayout = z.infer<typeof pageLayoutSchema>
export type ProductPage = z.infer<typeof productPageSchema>

export const publicProductPageResponseSchema = z.object({
  slug: z.string(),
  title: z.string(),
  seo: pageSeoSchema,
  layout: pageLayoutSchema,
  product: productSchema.pick({ slug: true, title: true, canonicalName: true }).extend({
    categorySlug: z.string().nullable(),
  }),
  blocks: z.array(contentBlockSchema),
})

export type PublicProductPageResponse = z.infer<typeof publicProductPageResponseSchema>

export function validateProductPageBlocks(blocks: unknown[]): string[] {
  const errors: string[] = []
  const ids = new Set<string>()

  for (const [index, block] of blocks.entries()) {
    const result = contentBlockSchema.safeParse(block)
    if (!result.success) {
      errors.push(
        `Block ${index} (${(block as { id?: string; type?: string })?.type ?? 'unknown'}): ${result.error.issues.map((i) => i.message).join(', ')}`,
      )
      continue
    }
    if (ids.has(result.data.id)) {
      errors.push(`Duplicate block id: ${result.data.id}`)
    }
    ids.add(result.data.id)
  }

  return errors
}

export function parseProductPageBlocks(blocks: unknown[]): ContentBlock[] {
  const errors = validateProductPageBlocks(blocks)
  if (errors.length > 0) {
    throw new Error(`Invalid product page blocks: ${errors.join('; ')}`)
  }

  return blocks.map((block) => contentBlockSchema.parse(block))
}
