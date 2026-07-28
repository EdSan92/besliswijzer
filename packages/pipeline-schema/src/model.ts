import { z } from 'zod'

export const pipelineRunStatusSchema = z.enum([
  'queued',
  'running',
  'needs_review',
  'approved',
  'failed',
  'published',
])

export const pipelineStepStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
])

export const pipelineArtifactKindSchema = z.enum([
  'keyword_data',
  'flow_brief',
  'compiled_flow',
  'content_package',
  'quality_report',
  'publish_record',
])

export type PipelineRunStatus = z.infer<typeof pipelineRunStatusSchema>
export type PipelineStepStatus = z.infer<typeof pipelineStepStatusSchema>
export type PipelineArtifactKind = z.infer<typeof pipelineArtifactKindSchema>

export const sourceReferenceSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  stepId: z.string().uuid().nullable().optional(),
  label: z.string().min(1),
  url: z.string().url().optional(),
  provider: z.string().optional(),
  retrievedAt: z.string().datetime(),
  assumption: z.boolean().default(false),
})

export const pipelineErrorSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  stepId: z.string().uuid().nullable().optional(),
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean().default(false),
  occurredAt: z.string().datetime(),
})

export const pipelineArtifactSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  stepId: z.string().uuid(),
  kind: pipelineArtifactKindSchema,
  version: z.number().int().positive(),
  payload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
})

export const pipelineStepSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  stepKey: z.string().min(1),
  status: pipelineStepStatusSchema,
  input: z.record(z.unknown()).nullable().optional(),
  output: z.record(z.unknown()).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  finishedAt: z.string().datetime().nullable().optional(),
  sortOrder: z.number().int().nonnegative(),
})

export const pipelineRunSchema = z.object({
  id: z.string().uuid(),
  idempotencyKey: z.string().min(1),
  categorySlug: z.string().min(1),
  language: z.string().min(2).default('nl'),
  pipelineVersion: z.string().min(1),
  inputVersion: z.string().min(1),
  status: pipelineRunStatusSchema,
  steps: z.array(pipelineStepSchema).default([]),
  artifacts: z.array(pipelineArtifactSchema).default([]),
  sources: z.array(sourceReferenceSchema).default([]),
  errors: z.array(pipelineErrorSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type SourceReference = z.infer<typeof sourceReferenceSchema>
export type PipelineError = z.infer<typeof pipelineErrorSchema>
export type PipelineArtifact = z.infer<typeof pipelineArtifactSchema>
export type PipelineStep = z.infer<typeof pipelineStepSchema>
export type PipelineRun = z.infer<typeof pipelineRunSchema>

export const idempotencyKeyInputSchema = z.object({
  categorySlug: z.string().min(1),
  language: z.string().min(2).default('nl'),
  pipelineVersion: z.string().min(1),
  inputVersion: z.string().min(1),
})

export type IdempotencyKeyInput = z.infer<typeof idempotencyKeyInputSchema>

export function buildIdempotencyKey(input: IdempotencyKeyInput): string {
  const parsed = idempotencyKeyInputSchema.parse(input)
  return [
    parsed.categorySlug,
    parsed.language,
    parsed.pipelineVersion,
    parsed.inputVersion,
  ].join(':')
}
