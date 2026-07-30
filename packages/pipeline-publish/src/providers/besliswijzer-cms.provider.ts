import type { FlowDefinition } from '@besliswijzer/flow-schema'
import type { ContentPackage } from '@besliswijzer/pipeline-quality'
import { mapCmsHttpError } from '../cms-http-errors.js'
import { mapContentPackageToBlocks } from '../content-package-to-blocks.js'
import { logCmsProviderMetrics, type CmsCallMetrics } from '../provider-metrics.js'
import type {
  CmsPublishMode,
  CmsPublishProvider,
  CmsUpsertFlowInput,
  CmsUpsertProductPageInput,
  CmsUpsertResult,
} from '../types.js'

type AdminFlowListItem = {
  id: string
  slug: string
  publishedVersionNumber: number | null
}

type AdminProductPage = {
  slug: string
  status: CmsPublishMode | 'published' | 'draft'
  version?: number
}

export type BesliswijzerCmsPublishProviderOptions = {
  apiBase: string
  adminApiKey: string
  fetchImpl?: typeof fetch
  onMetrics?: (metrics: CmsCallMetrics) => void
}

export class BesliswijzerCmsPublishProvider implements CmsPublishProvider {
  readonly name = 'besliswijzer_cms'
  private readonly fetchImpl: typeof fetch
  private readonly versionState = new Map<string, number>()

  constructor(private readonly options: BesliswijzerCmsPublishProviderOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-admin-api-key': this.options.adminApiKey,
    }
  }

  private url(path: string): string {
    return `${this.options.apiBase.replace(/\/$/, '')}${path}`
  }

  private versionKey(type: 'flow' | 'product_page', veraioId: string, locale: string): string {
    return `${type}:${veraioId}:${locale}`
  }

  private recordMetrics(metrics: CmsCallMetrics): void {
    if (this.options.onMetrics) {
      this.options.onMetrics(metrics)
      return
    }

    logCmsProviderMetrics(metrics)
  }

  private async request(
    operation: CmsCallMetrics['operation'],
    resourceType: CmsCallMetrics['resourceType'],
    input: RequestInfo,
    init?: RequestInit,
  ): Promise<Response> {
    const startedAt = Date.now()
    const response = await this.fetchImpl(input, init)
    const latencyMs = Date.now() - startedAt

    this.recordMetrics({
      provider: this.name,
      operation,
      resourceType,
      status: response.ok ? 'success' : 'error',
      httpStatus: response.status,
      latencyMs,
    })

    return response
  }

  async getFlowVersion(veraioId: string, locale: string): Promise<number | null> {
    const cached = this.versionState.get(this.versionKey('flow', veraioId, locale))
    if (cached !== undefined) {
      return cached
    }

    const response = await this.request(
      'get_flow_version',
      'flow',
      this.url('/api/v1/admin/flows'),
      {
        headers: this.headers(),
      },
    )

    if (response.status === 401 || response.status === 403) {
      throw mapCmsHttpError({
        status: response.status,
        operation: 'get_flow_version',
        resourceType: 'flow',
      })
    }

    if (!response.ok) {
      return null
    }

    const flows = (await response.json()) as AdminFlowListItem[]
    const slug = veraioId.split(':')[0]
    const match = flows.find((flow) => flow.slug === slug)
    return match?.publishedVersionNumber ?? null
  }

  async getProductPageVersion(veraioId: string, locale: string): Promise<number | null> {
    const cached = this.versionState.get(this.versionKey('product_page', veraioId, locale))
    if (cached !== undefined) {
      return cached
    }

    const slug = veraioId.split(':')[0]
    const response = await this.request(
      'get_product_page_version',
      'product_page',
      this.url(`/api/v1/admin/product-pages/${slug}`),
      {
        headers: this.headers(),
      },
    )

    if (response.status === 404) {
      return null
    }

    if (response.status === 401 || response.status === 403) {
      throw mapCmsHttpError({
        status: response.status,
        operation: 'get_product_page_version',
        resourceType: 'product_page',
      })
    }

    if (!response.ok) {
      return null
    }

    const page = (await response.json()) as AdminProductPage
    return page.version ?? 1
  }

  async upsertFlow(input: CmsUpsertFlowInput): Promise<CmsUpsertResult> {
    const response = await this.request(
      'upsert_flow',
      'flow',
      this.url('/api/v1/admin/flows/import'),
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          flow: input.flow,
          publish: input.mode === 'publish',
        }),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw mapCmsHttpError({
        status: response.status,
        operation: 'upsert_flow',
        resourceType: 'flow',
        detail: error,
      })
    }

    const payload = (await response.json()) as { flowId?: string; slug?: string }
    const version = (input.expectedVersion ?? 0) + 1
    this.versionState.set(this.versionKey('flow', input.veraioId, input.locale), version)

    return {
      remoteId: payload.flowId ?? payload.slug ?? input.slug,
      version,
      status: input.mode,
      publishedAt: new Date().toISOString(),
    }
  }

  async upsertProductPage(input: CmsUpsertProductPageInput): Promise<CmsUpsertResult> {
    const blocks = mapContentPackageToBlocks(input.content)
    const body = {
      page: {
        title: input.content.metadata.title,
        seoMeta: {
          title: input.content.metadata.title,
          description: input.content.metadata.description,
        },
        layout: { blockOrder: blocks.map((block) => block.id) },
        blocks,
      },
    }

    const response = await this.request(
      'upsert_product_page',
      'product_page',
      this.url(`/api/v1/admin/product-pages/${input.slug}`),
      {
        method: 'PATCH',
        headers: this.headers(),
        body: JSON.stringify(body),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw mapCmsHttpError({
        status: response.status,
        operation: 'upsert_product_page',
        resourceType: 'product_page',
        detail: error,
      })
    }

    const version = (input.expectedVersion ?? 0) + 1
    this.versionState.set(this.versionKey('product_page', input.veraioId, input.locale), version)

    return {
      remoteId: `page:${input.slug}:${input.locale}`,
      version,
      status: input.mode,
      publishedAt: new Date().toISOString(),
    }
  }
}
