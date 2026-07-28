import type { FlowDefinition } from '@besliswijzer/flow-schema'
import type { ContentPackage } from '@besliswijzer/pipeline-quality'

export type CmsPublishMode = 'draft' | 'publish'

export type CmsUpsertFlowInput = {
  veraioId: string
  locale: string
  slug: string
  flow: FlowDefinition
  expectedVersion?: number | null
  mode: CmsPublishMode
}

export type CmsUpsertProductPageInput = {
  veraioId: string
  locale: string
  slug: string
  content: ContentPackage
  expectedVersion?: number | null
  mode: CmsPublishMode
}

export type CmsUpsertResult = {
  remoteId: string
  version: number
  status: CmsPublishMode
  publishedAt: string
}

export interface CmsPublishProvider {
  readonly name: string
  getFlowVersion(veraioId: string, locale: string): Promise<number | null>
  getProductPageVersion(veraioId: string, locale: string): Promise<number | null>
  upsertFlow(input: CmsUpsertFlowInput): Promise<CmsUpsertResult>
  upsertProductPage(input: CmsUpsertProductPageInput): Promise<CmsUpsertResult>
}
