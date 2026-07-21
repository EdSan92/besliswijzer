import type { ContentBlock } from '@besliswijzer/product-schema'
import { validateProductPageBlocks } from '@besliswijzer/product-schema'
import type { AIProvider } from '../providers/ai/ai-provider.interface.js'
import type { BesliswijzerApiClient } from '../clients/besliswijzer-api.client.js'
import {
  productPageContentSchema,
  type GenerateProductPageRequest,
  type ProductPageContent,
  type RegenerateProductPageRequest,
} from '../models/product-page-content.js'
import type { PromptBuilder } from './prompt-builder.service.js'

export type AssembleProductPageInput = {
  content: ProductPageContent
  flowId: string
  flowSlug: string
}

export type GeneratedProductPage = {
  pageSlug: string
  pageTitle: string
  seo: ProductPageContent['seo']
  blocks: ContentBlock[]
  blockOrder: string[]
}

export function assembleProductPageBlocks(input: AssembleProductPageInput): GeneratedProductPage {
  const { content, flowId, flowSlug } = input
  const generatedAt = new Date().toISOString()

  const blocks: ContentBlock[] = [
    {
      id: 'blk_hero',
      type: 'hero',
      sortOrder: 0,
      visible: true,
      source: 'ai',
      aiPromptKey: 'generate-product-page',
      generatedAt,
      data: {
        headline: content.hero.headline,
        subheadline: content.hero.subheadline,
        badges: content.hero.badges,
      },
    },
    {
      id: 'blk_intro',
      type: 'intro',
      sortOrder: 1,
      visible: true,
      source: 'ai',
      aiPromptKey: 'generate-product-page',
      generatedAt,
      data: {
        title: content.intro.title,
        body: content.intro.body,
      },
    },
    {
      id: 'blk_flow',
      type: 'flow',
      sortOrder: 2,
      visible: true,
      source: 'manual',
      data: {
        flowId,
        flowSlug,
        anchorId: 'keuzehulp',
        ctaLabel: 'Start de keuzehulp',
        displayMode: 'section',
      },
    },
    {
      id: 'blk_faq',
      type: 'faq',
      sortOrder: 3,
      visible: true,
      source: 'ai',
      aiPromptKey: 'generate-product-page',
      generatedAt,
      data: {
        title: `Veelgestelde vragen over ${content.pageTitle.toLowerCase()}`,
        items: content.faqItems.map((item, index) => ({
          id: `faq_gen_${index + 1}`,
          question: item.question,
          answer: item.answer,
          source: 'ai' as const,
        })),
      },
    },
  ]

  return {
    pageSlug: content.pageSlug,
    pageTitle: content.pageTitle,
    seo: content.seo,
    blocks,
    blockOrder: ['blk_hero', 'blk_intro', 'blk_flow', 'blk_faq'],
  }
}

const GENERATION_RETRY_LIMIT = 2

function assertValidGeneratedPage(page: GeneratedProductPage) {
  const blockErrors = validateProductPageBlocks(page.blocks)
  if (blockErrors.length > 0) {
    throw new Error(`Generated content blocks invalid: ${blockErrors.join('; ')}`)
  }
}

function isRetriableGenerationError(error: Error): boolean {
  return /Generated content blocks invalid|failed schema validation|JSON|Update product page failed|Create product page failed|Internal server error/i.test(
    error.message,
  )
}

export class ProductPageContentAgent {
  constructor(
    private readonly aiProvider: AIProvider,
    private readonly promptBuilder: PromptBuilder,
    private readonly besliswijzer: BesliswijzerApiClient,
  ) {}

  async generateContent(
    input: GenerateProductPageRequest,
  ): Promise<{ content: ProductPageContent; page: GeneratedProductPage }> {
    const prompt = this.promptBuilder.generateProductPage({
      productTitle: input.productTitle,
      canonicalName: input.canonicalName,
      category: input.categoryTitle,
      flowTitle: input.flowTitle,
      seedKeywords: input.seedKeywords,
      contentKeywords: input.contentKeywords,
    })

    const { data } = await this.aiProvider.generateObject(productPageContentSchema, prompt, {
      promptName: 'generate-product-page',
    })

    const baseContent = data as ProductPageContent
    const content: ProductPageContent = input.pageSlug
      ? { ...baseContent, pageSlug: input.pageSlug }
      : baseContent
    const page = assembleProductPageBlocks({
      content,
      flowId: input.flowId,
      flowSlug: input.flowSlug,
    })

    return { content, page }
  }

  private async syncKeywords(input: GenerateProductPageRequest, productId: string) {
    const keywords = input.contentKeywords ?? input.seedKeywords?.map((term: string) => ({ term })) ?? []
    if (keywords.length === 0) return

    await this.besliswijzer.syncProductKeywords(input.productSlug, {
      productId,
      keywords,
    })
  }

  async generateAndSave(input: GenerateProductPageRequest) {
    let lastError: Error | undefined

    for (let attempt = 0; attempt < GENERATION_RETRY_LIMIT; attempt++) {
      try {
        const { page } = await this.generateContent(input)
        assertValidGeneratedPage(page)

        const result = await this.besliswijzer.createProductPage({
          product: {
            slug: input.productSlug,
            title: input.productTitle,
            canonicalName: input.canonicalName,
            categoryId: input.categoryId ?? null,
            primaryFlowId: input.flowId,
          },
          page: {
            slug: page.pageSlug,
            title: page.pageTitle,
            seoMeta: { ...page.seo, twitterCard: 'summary_large_image' as const },
            layout: { blockOrder: page.blockOrder },
            blocks: page.blocks,
            status: input.publish ? 'published' : 'draft',
          },
        })

        await this.syncKeywords(input, result.productId)

        return { ...result, generated: page }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt + 1 < GENERATION_RETRY_LIMIT && isRetriableGenerationError(lastError)) {
          continue
        }
        throw lastError
      }
    }

    throw lastError ?? new Error('Product page generation failed')
  }

  async regenerateAndSave(input: RegenerateProductPageRequest) {
    let lastError: Error | undefined

    for (let attempt = 0; attempt < GENERATION_RETRY_LIMIT; attempt++) {
      try {
        const { page } = await this.generateContent({ ...input, pageSlug: input.pageSlug })
        assertValidGeneratedPage(page)

        const result = await this.besliswijzer.updateProductPage(input.pageSlug, {
          page: {
            title: page.pageTitle,
            seoMeta: { ...page.seo, twitterCard: 'summary_large_image' as const },
            layout: { blockOrder: page.blockOrder },
            blocks: page.blocks,
          },
        })

        await this.syncKeywords(input, result.productId)

        return { ...result, generated: page }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt + 1 < GENERATION_RETRY_LIMIT && isRetriableGenerationError(lastError)) {
          continue
        }
        throw lastError
      }
    }

    throw lastError ?? new Error('Product page regeneration failed')
  }
}
