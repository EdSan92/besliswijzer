export class PipelineReviewError extends Error {
  readonly code:
    | 'NOT_FOUND'
    | 'INVALID_STATUS'
    | 'VALIDATION_FAILED'
    | 'REASON_REQUIRED'
    | 'BLOCKING_QUALITY'

  constructor(message: string, code: PipelineReviewError['code']) {
    super(message)
    this.name = 'PipelineReviewError'
    this.code = code
  }
}
