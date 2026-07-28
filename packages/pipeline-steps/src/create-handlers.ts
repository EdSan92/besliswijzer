import type { ContentPackageModelProvider } from '@besliswijzer/content-package'
import type { FlowBriefModelProvider } from '@besliswijzer/flow-brief'
import type { KeywordResearchProvider } from '@besliswijzer/keyword-research'
import type { PipelineStepHandler } from '@besliswijzer/pipeline-schema'
import { createCompileFlowHandler } from './handlers/compile-flow.handler.js'
import { createContentPackageHandler } from './handlers/content-package.handler.js'
import { createFlowBriefHandler } from './handlers/flow-brief.handler.js'
import { createKeywordIngestHandler } from './handlers/keyword-ingest.handler.js'
import { createQualityGateHandler } from './handlers/quality-gate.handler.js'

export type CreatePipelineHandlersDeps = {
  keywordProvider: KeywordResearchProvider
  flowBriefProvider: FlowBriefModelProvider
  contentPackageProvider: ContentPackageModelProvider
  now?: () => string
}

export function createDefaultPipelineHandlers(
  deps: CreatePipelineHandlersDeps,
): PipelineStepHandler[] {
  return [
    createKeywordIngestHandler({ provider: deps.keywordProvider, now: deps.now }),
    createFlowBriefHandler({ provider: deps.flowBriefProvider, now: deps.now }),
    createCompileFlowHandler(),
    createContentPackageHandler({ provider: deps.contentPackageProvider, now: deps.now }),
    createQualityGateHandler(),
  ]
}
