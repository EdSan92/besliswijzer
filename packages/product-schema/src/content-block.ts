import { z } from 'zod'
import { contentBlockSourceSchema } from './product.js'

/** All supported block types — phase 1 implements hero, flow, faq in the frontend. */
export const contentBlockTypeSchema = z.enum([
  'hero',
  'intro',
  'flow',
  'tldr',
  'why',
  'features',
  'buyingGuide',
  'comparison',
  'topProducts',
  'faq',
  'mistakes',
  'maintenance',
  'alternatives',
  'relatedFlows',
  'reviews',
  'cta',
  'structuredData',
])

export type ContentBlockType = z.infer<typeof contentBlockTypeSchema>

export const contentBlockBaseSchema = z.object({
  id: z.string().min(1),
  type: contentBlockTypeSchema,
  sortOrder: z.number().int().default(0),
  visible: z.boolean().default(true),
  source: contentBlockSourceSchema.default('manual'),
  sourceRef: z.string().optional(),
  aiPromptKey: z.string().optional(),
  generatedAt: z.string().optional(),
})

export const heroBlockDataSchema = z.object({
  headline: z.string().min(1),
  subheadline: z.string().optional(),
  image: z
    .object({
      src: z.string(),
      alt: z.string(),
    })
    .optional(),
  badges: z.array(z.string()).optional(),
})

export const flowBlockDataSchema = z.object({
  flowId: z.string().uuid(),
  flowSlug: z.string().min(2),
  anchorId: z.string().optional(),
  ctaLabel: z.string().optional(),
  displayMode: z.enum(['inline', 'modal', 'section']).default('section'),
})

export const faqItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  source: z.enum(['manual', 'opportunity', 'ai']).optional(),
  opportunityId: z.string().optional(),
})

export const faqBlockDataSchema = z.object({
  title: z.string().optional(),
  items: z.array(faqItemSchema).min(1),
})

export const introBlockDataSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(1),
})

const heroBlockSchema = contentBlockBaseSchema.extend({
  type: z.literal('hero'),
  data: heroBlockDataSchema,
})

const flowBlockSchema = contentBlockBaseSchema.extend({
  type: z.literal('flow'),
  data: flowBlockDataSchema,
})

const faqBlockSchema = contentBlockBaseSchema.extend({
  type: z.literal('faq'),
  data: faqBlockDataSchema,
})

const introBlockSchema = contentBlockBaseSchema.extend({
  type: z.literal('intro'),
  data: introBlockDataSchema,
})

/** Phase 1: strict validation for implemented blocks; passthrough for future types. */
export const contentBlockSchema = z.discriminatedUnion('type', [
  heroBlockSchema,
  introBlockSchema,
  flowBlockSchema,
  faqBlockSchema,
])

export type ContentBlock = z.infer<typeof contentBlockSchema>
export type HeroBlock = z.infer<typeof heroBlockSchema>
export type FlowBlock = z.infer<typeof flowBlockSchema>
export type FAQBlock = z.infer<typeof faqBlockSchema>
export type IntroBlock = z.infer<typeof introBlockSchema>
export type FAQItem = z.infer<typeof faqItemSchema>

export function sortContentBlocks(blocks: ContentBlock[], blockOrder: string[]): ContentBlock[] {
  const visible = blocks.filter((block) => block.visible)
  const byId = new Map(visible.map((block) => [block.id, block]))

  if (blockOrder.length === 0) {
    return [...visible].sort((a, b) => a.sortOrder - b.sortOrder)
  }

  const ordered = blockOrder.map((id) => byId.get(id)).filter(Boolean) as ContentBlock[]
  const orderedIds = new Set(ordered.map((block) => block.id))
  const remainder = visible
    .filter((block) => !orderedIds.has(block.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return [...ordered, ...remainder]
}
