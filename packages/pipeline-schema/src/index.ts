export {
  buildIdempotencyKey,
  idempotencyKeyInputSchema,
  pipelineArtifactKindSchema,
  pipelineArtifactSchema,
  pipelineErrorSchema,
  pipelineRunSchema,
  pipelineRunStatusSchema,
  pipelineStepSchema,
  pipelineStepStatusSchema,
  sourceReferenceSchema,
  type IdempotencyKeyInput,
  type PipelineArtifact,
  type PipelineArtifactKind,
  type PipelineError,
  type PipelineRun,
  type PipelineRunStatus,
  type PipelineStep,
  type PipelineStepStatus,
  type SourceReference,
} from './model.js'
export {
  assertValidRunStatusTransition,
  canTransitionRunStatus,
  isTerminalRunStatus,
  PIPELINE_RUN_TRANSITIONS,
} from './transitions.js'
export { InMemoryPipelineRunStore } from './in-memory-store.js'
export {
  createOrGetPipelineRun,
  createPipelineRun,
  createPipelineRunStrict,
  DuplicatePipelineRunError,
  transitionPipelineRunStatus,
  updatePipelineStep,
  type CreatePipelineRunInput,
  type CreatePipelineRunResult,
  type PipelineRunStore,
} from './store.js'
export {
  assertRegistryCoversSteps,
  PipelineStepRegistry,
} from './orchestrator/registry.js'
export {
  PipelineOrchestrator,
  type PipelineOrchestratorOptions,
  type ResumePipelineRunOptions,
  type RetryPipelineStepOptions,
  type StartPipelineRunOptions,
} from './orchestrator/orchestrator.js'
export {
  buildStepIdempotencyKey,
  PipelineStepExecutionError,
  type PipelineStepContext,
  type PipelineStepHandler,
  type PipelineStepResult,
} from './orchestrator/types.js'

/**
 * Pipeline run status machine (R4 contentpipeline):
 *
 * queued → running → needs_review → approved → published
 *           ↓           ↓             ↓
 *         failed ←←←←←←←←←←←←←←←←←←←←←
 *           ↓
 *         queued (retry)
 *
 * `published` is terminal.
 */
