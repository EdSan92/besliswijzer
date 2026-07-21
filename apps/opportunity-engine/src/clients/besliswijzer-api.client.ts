import type { ProductMatchCandidate } from '@besliswijzer/product-schema'
import { logger } from '../utils/logger.js'

export type AppendFaqInput = {
  opportunityId: string
  keywordTerm: string
  question: string
  answer: string
}

export type AppendFaqResult = {
  pageSlug: string
  faqItemId: string
  created: boolean
}

export type CreateProductPageInput = {
  product: {
    slug: string
    title: string
    canonicalName: string
    categoryId?: string | null
    primaryFlowId: string
  }
  page: {
    slug: string
    title: string
    seoMeta: {
      title: string
      description: string
      twitterCard?: 'summary' | 'summary_large_image'
    }
    layout: { blockOrder: string[] }
    blocks: unknown[]
    status?: 'draft' | 'published'
  }
}

export type CreateProductPageResult = {
  productId: string
  pageId: string
  pageSlug: string
  status: string
}

export type UpdateProductPageInput = {
  page: {
    title?: string
    seoMeta?: {
      title: string
      description: string
      twitterCard?: 'summary' | 'summary_large_image'
    }
    layout?: { blockOrder: string[] }
    blocks?: unknown[]
  }
}

export type UpdateProductPageResult = {
  productId: string
  pageId: string
  pageSlug: string
  status: string
}

export type SyncProductKeywordsInput = {
  productId: string
  keywords: Array<{
    term: string
    opportunityId?: string
    score?: number
  }>
}

export class BesliswijzerApiClient {
  private readonly baseUrl: string
  private readonly adminKey: string

  constructor(baseUrl?: string, adminKey?: string) {
    this.baseUrl = (
      baseUrl ??
      process.env.BESLIJSWIJZER_API_BASE ??
      'http://localhost:3101'
    ).replace(/\/$/, '')
    this.adminKey = adminKey ?? process.env.ADMIN_API_KEY ?? 'dev-admin-key'
  }

  async matchProduct(keyword: string, category?: string): Promise<ProductMatchCandidate | null> {
    const params = new URLSearchParams({ keyword })
    if (category?.trim()) params.set('category', category.trim())

    const response = await fetch(`${this.baseUrl}/api/v1/admin/products/match?${params}`, {
      headers: { 'x-admin-key': this.adminKey },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Product match failed (${response.status}): ${body}`)
    }

    const data = (await response.json()) as { match: ProductMatchCandidate | null }
    return data.match ?? null
  }

  async appendFaqItem(pageSlug: string, input: AppendFaqInput): Promise<AppendFaqResult> {
    const response = await fetch(`${this.baseUrl}/api/v1/admin/product-pages/${pageSlug}/faq-items`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-key': this.adminKey,
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Append FAQ failed (${response.status}): ${body}`)
    }

    return (await response.json()) as AppendFaqResult
  }

  async createProductPage(input: CreateProductPageInput): Promise<CreateProductPageResult> {
    const response = await fetch(`${this.baseUrl}/api/v1/admin/product-pages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-key': this.adminKey,
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Create product page failed (${response.status}): ${body}`)
    }

    return (await response.json()) as CreateProductPageResult
  }

  async updateProductPage(
    pageSlug: string,
    input: UpdateProductPageInput,
  ): Promise<UpdateProductPageResult> {
    const response = await fetch(`${this.baseUrl}/api/v1/admin/product-pages/${pageSlug}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-admin-key': this.adminKey,
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const body = await response.text()
      let message = `Update product page failed (${response.status}): ${body}`
      try {
        const parsed = JSON.parse(body) as { error?: string }
        if (parsed.error?.includes('Validation error')) {
          message = `Productpagina validatie mislukt: ${parsed.error}`
        }
      } catch {
        // Keep raw body in message.
      }
      throw new Error(message)
    }

    return (await response.json()) as UpdateProductPageResult
  }

  async syncProductKeywords(
    productSlug: string,
    input: SyncProductKeywordsInput,
  ): Promise<{ synced: number }> {
    const response = await fetch(`${this.baseUrl}/api/v1/admin/products/${productSlug}/keywords`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-admin-key': this.adminKey,
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Sync product keywords failed (${response.status}): ${body}`)
    }

    return (await response.json()) as { synced: number }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { method: 'GET' })
      return response.ok
    } catch (error) {
      logger.warn({ error }, 'Besliswijzer API health check failed')
      return false
    }
  }
}
