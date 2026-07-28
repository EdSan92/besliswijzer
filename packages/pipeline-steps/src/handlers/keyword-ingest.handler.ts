import type { KeywordResearchArtifact } from '@besliswijzer/keyword-research'
import { ingestKeywordResearch, type KeywordResearchProvider } from '@besliswijzer/keyword-research'
import type { PipelineStepHandler } from '@besliswijzer/pipeline-schema'
import { createPipelineArtifact } from '../artifact-envelope.js'
import { PIPELINE_STEP_KEYS } from '../step-keys.js'

export type KeywordIngestStepInput = {
  primaryKeyword: string
  language?: string
  categoryTitle?: string
}

export type KeywordIngestHandlerDeps = {
  provider: KeywordResearchProvider
  now?: () => string
}

export function createKeywordIngestHandler(
  deps: KeywordIngestHandlerDeps,
): PipelineStepHandler<KeywordIngestStepInput, { keywordArtifact: KeywordResearchArtifact }> {
  const now = deps.now ?? (() => new Date().toISOString())

  return {
    stepKey: PIPELINE_STEP_KEYS.KEYWORD_INGEST,
    execute: async ({ run, step, input }) => {
      const artifact = await ingestKeywordResearch({
        provider: deps.provider,
        request: {
          primaryKeyword: input.primaryKeyword,
          language: input.language ?? run.language,
        },
        now,
      })

      return {
        output: {
          keywordArtifact: artifact,
          categoryTitle: input.categoryTitle ?? run.categorySlug,
          language: artifact.language,
        },
        artifacts: [
          createPipelineArtifact({
            run,
            stepId: step.id,
            kind: 'keyword_data',
            payload: artifact,
            now,
          }),
        ],
      }
    },
  }
}
