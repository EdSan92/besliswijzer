import {
  buildGenerateContentPackagePrompt,
  buildRepairContentPackagePrompt,
} from './prompts/generate-content-package.prompt.js'
import {
  createContentPackageArtifact,
  CONTENT_PACKAGE_PROMPT_VERSION,
  type ContentPackageArtifact,
} from './artifact.js'
import type { ContentPackageGenerationInput, ContentPackageModelProvider } from './types.js'
import {
  parseContentPackageGenerationOutput,
  validateParsedContentPackageOutput,
} from './validate-output.js'
import { assessContentPackageQuality, mergeWarnings } from './warnings.js'

export class ContentPackageGenerationError extends Error {
  readonly code: 'INVALID_OUTPUT' | 'REPAIR_FAILED'
  readonly errors: string[]

  constructor(message: string, code: 'INVALID_OUTPUT' | 'REPAIR_FAILED', errors: string[]) {
    super(message)
    this.name = 'ContentPackageGenerationError'
    this.code = code
    this.errors = errors
  }
}

export type GenerateContentPackageOptions = {
  provider: ContentPackageModelProvider
  input: ContentPackageGenerationInput
  promptVersion?: string
  now?: () => string
}

function defaultNow(): string {
  return new Date().toISOString()
}

export async function generateContentPackage(
  options: GenerateContentPackageOptions,
): Promise<ContentPackageArtifact> {
  const promptVersion = options.promptVersion ?? CONTENT_PACKAGE_PROMPT_VERSION
  const now = options.now ?? defaultNow
  const prompt = buildGenerateContentPackagePrompt(options.input, promptVersion)

  const initial = await generateAndParse(options.provider, prompt)
  const initialSemanticErrors = initial.ok ? validateParsedContentPackageOutput(initial.output) : []

  if (initial.ok && initialSemanticErrors.length === 0) {
    return finalizeArtifact(initial.output, options.provider, promptVersion, now())
  }

  if (!options.provider.repairStructured) {
    throw new ContentPackageGenerationError(
      'Model output could not be validated as a content package',
      'INVALID_OUTPUT',
      initial.ok ? initialSemanticErrors : initial.errors,
    )
  }

  const repairErrors = initial.ok ? initialSemanticErrors : initial.errors
  const repairPrompt = buildRepairContentPackagePrompt(
    options.input,
    promptVersion,
    initial.ok ? initial.output : initial.raw,
    repairErrors,
  )

  const repaired = await options.provider.repairStructured(
    repairPrompt,
    initial.ok ? initial.output : initial.raw,
    repairErrors,
  )
  const reparsed = parseContentPackageGenerationOutput(repaired.raw)

  if (!reparsed.ok) {
    throw new ContentPackageGenerationError(
      'Repair attempt did not produce valid content package output',
      'REPAIR_FAILED',
      reparsed.errors,
    )
  }

  const repairedSemanticErrors = validateParsedContentPackageOutput(reparsed.output)
  if (repairedSemanticErrors.length > 0) {
    throw new ContentPackageGenerationError(
      'Content package still invalid after repair attempt',
      'REPAIR_FAILED',
      repairedSemanticErrors,
    )
  }

  return finalizeArtifact(reparsed.output, options.provider, promptVersion, now())
}

async function generateAndParse(provider: ContentPackageModelProvider, prompt: string) {
  const response = await provider.generateStructured(prompt)
  return parseContentPackageGenerationOutput(response.raw)
}

function finalizeArtifact(
  output: {
    content: ContentPackageArtifact['content']
    internalLinks: ContentPackageArtifact['internalLinks']
    claims: ContentPackageArtifact['claims']
    warnings: ContentPackageArtifact['warnings']
  },
  provider: ContentPackageModelProvider,
  promptVersion: string,
  generatedAt: string,
): ContentPackageArtifact {
  const qualityWarnings = assessContentPackageQuality(output.content, output.claims)
  const warnings = mergeWarnings(output.warnings, qualityWarnings)

  return createContentPackageArtifact({
    promptVersion,
    content: output.content,
    internalLinks: output.internalLinks,
    claims: output.claims,
    warnings,
    model: {
      provider: provider.provider,
      name: provider.model,
    },
    generatedAt,
  })
}
