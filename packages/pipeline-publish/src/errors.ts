export type PipelinePublishErrorCode =
  | 'NOT_APPROVED'
  | 'MISSING_ARTIFACT'
  | 'VERSION_CONFLICT'
  | 'PARTIAL_PUBLISH'

export class PipelinePublishError extends Error {
  readonly code: PipelinePublishErrorCode

  constructor(message: string, code: PipelinePublishErrorCode) {
    super(message)
    this.name = 'PipelinePublishError'
    this.code = code
  }
}

export class CmsVersionConflictError extends PipelinePublishError {
  readonly resourceType: 'flow' | 'product_page'
  readonly expectedVersion: number | null
  readonly actualVersion: number | null

  constructor(
    resourceType: 'flow' | 'product_page',
    expectedVersion: number | null,
    actualVersion: number | null,
  ) {
    super(
      `CMS ${resourceType} version conflict: expected ${expectedVersion ?? 'none'}, actual ${actualVersion ?? 'none'}`,
      'VERSION_CONFLICT',
    )
    this.resourceType = resourceType
    this.expectedVersion = expectedVersion
    this.actualVersion = actualVersion
  }
}
