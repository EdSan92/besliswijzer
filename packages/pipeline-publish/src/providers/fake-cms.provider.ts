import type { FlowDefinition } from '@besliswijzer/flow-schema'
import type { ContentPackage } from '@besliswijzer/pipeline-quality'
import type {
  CmsPublishMode,
  CmsPublishProvider,
  CmsUpsertFlowInput,
  CmsUpsertProductPageInput,
  CmsUpsertResult,
} from '../types.js'

type StoredResource = {
  remoteId: string
  version: number
  status: CmsPublishMode
  flow?: FlowDefinition
  content?: ContentPackage
}

function resourceKey(veraioId: string, locale: string, type: 'flow' | 'product_page'): string {
  return `${type}:${veraioId}:${locale}`
}

export class FakeCmsPublishProvider implements CmsPublishProvider {
  readonly name = 'fake_cms'
  private readonly resources = new Map<string, StoredResource>()
  private callCount = 0
  private readonly seedVersion?: number
  private readonly failOn?: 'flow' | 'product_page'

  constructor(options?: { seedVersion?: number; failOn?: 'flow' | 'product_page' }) {
    this.seedVersion = options?.seedVersion
    this.failOn = options?.failOn

    if (options?.seedVersion !== undefined) {
      this.resources.set(resourceKey('airfryers:nl', 'nl', 'flow'), {
        remoteId: 'flow:airfryers:nl',
        version: options.seedVersion,
        status: 'draft',
      })
    }
  }

  getCallCount(): number {
    return this.callCount
  }

  async getFlowVersion(veraioId: string, locale: string): Promise<number | null> {
    return this.resources.get(resourceKey(veraioId, locale, 'flow'))?.version ?? null
  }

  async getProductPageVersion(veraioId: string, locale: string): Promise<number | null> {
    return this.resources.get(resourceKey(veraioId, locale, 'product_page'))?.version ?? null
  }

  async upsertFlow(input: CmsUpsertFlowInput): Promise<CmsUpsertResult> {
    this.callCount += 1
    if (this.failOn === 'flow') {
      throw new Error('Simulated flow publish failure')
    }

    const key = resourceKey(input.veraioId, input.locale, 'flow')
    const current = this.resources.get(key)
    if (
      input.expectedVersion !== undefined &&
      input.expectedVersion !== null &&
      current &&
      current.version !== input.expectedVersion
    ) {
      throw new Error('Version conflict')
    }

    const version = current ? current.version + 1 : 1
    const publishedAt = new Date().toISOString()
    const remoteId = `flow:${input.slug}:${input.locale}`
    this.resources.set(key, {
      remoteId,
      version,
      status: input.mode,
      flow: input.flow,
    })

    return { remoteId, version, status: input.mode, publishedAt }
  }

  async upsertProductPage(input: CmsUpsertProductPageInput): Promise<CmsUpsertResult> {
    this.callCount += 1
    if (this.failOn === 'product_page') {
      throw new Error('Simulated product page publish failure')
    }

    const key = resourceKey(input.veraioId, input.locale, 'product_page')
    const current = this.resources.get(key)
    if (
      input.expectedVersion !== undefined &&
      input.expectedVersion !== null &&
      current &&
      current.version !== input.expectedVersion
    ) {
      throw new Error('Version conflict')
    }

    const version = current ? current.version + 1 : 1
    const publishedAt = new Date().toISOString()
    const remoteId = `page:${input.slug}:${input.locale}`
    this.resources.set(key, {
      remoteId,
      version,
      status: input.mode,
      content: input.content,
    })

    return { remoteId, version, status: input.mode, publishedAt }
  }
}
