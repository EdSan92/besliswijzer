export const PIPELINE_STEP_KEYS = {
  KEYWORD_INGEST: 'keyword_ingest',
  FLOW_BRIEF: 'flow_brief',
  COMPILE_FLOW: 'compile_flow',
  CONTENT_PACKAGE: 'content_package',
  QUALITY_GATE: 'quality_gate',
} as const

export type PipelineStepKey = (typeof PIPELINE_STEP_KEYS)[keyof typeof PIPELINE_STEP_KEYS]

export const DEFAULT_PIPELINE_STEP_KEYS: PipelineStepKey[] = [
  PIPELINE_STEP_KEYS.KEYWORD_INGEST,
  PIPELINE_STEP_KEYS.FLOW_BRIEF,
  PIPELINE_STEP_KEYS.COMPILE_FLOW,
  PIPELINE_STEP_KEYS.CONTENT_PACKAGE,
  PIPELINE_STEP_KEYS.QUALITY_GATE,
]

export const PIPELINE_VERSION = '1.0.0' as const
