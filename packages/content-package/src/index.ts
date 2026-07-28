export {
  CONTENT_PACKAGE_ARTIFACT_VERSION,
  CONTENT_PACKAGE_PROMPT_VERSION,
  createContentPackageArtifact,
  contentPackageArtifactSchema,
  contentPackageGenerationOutputSchema,
  internalLinkSuggestionSchema,
} from './artifact.js'
export type {
  ContentPackageArtifact,
  ContentPackageGenerationOutput,
  CreateContentPackageArtifactInput,
  InternalLinkSuggestion,
} from './artifact.js'

export { readContentPackageConfigFromEnv } from './config.js'
export type { ContentPackageConfig } from './config.js'

export { generateContentPackage, ContentPackageGenerationError } from './generate.js'
export type { GenerateContentPackageOptions } from './generate.js'

export {
  buildGenerateContentPackagePrompt,
  buildRepairContentPackagePrompt,
} from './prompts/generate-content-package.prompt.js'

export { MockContentPackageModelProvider } from './providers/mock-content-package.provider.js'

export {
  mapFlowBriefToInput,
  mapKeywordArtifactToInput,
  type ContentPackageGenerationInput,
  type ContentPackageModelProvider,
  type ContentPackageModelResponse,
} from './types.js'

export {
  parseContentPackageGenerationOutput,
  validateParsedContentPackageOutput,
} from './validate-output.js'
export type { ParsedContentPackageOutput } from './validate-output.js'

export {
  assessContentPackageQuality,
  contentPackageWarningSchema,
  mergeWarnings,
} from './warnings.js'
export type { ContentPackageWarning } from './warnings.js'

export { validGenerationOutput as MOCK_CONTENT_PACKAGE_OUTPUT } from './fixtures/generation-output.js'
