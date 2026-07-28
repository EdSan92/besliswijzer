import { buildGenerateFlowBriefPrompt, buildRepairFlowBriefPrompt } from './prompts/generate-flowbrief.prompt.js'
import {
  createFlowBriefArtifact,
  FLOW_BRIEF_PROMPT_VERSION,
  type FlowBriefArtifact,
} from './artifact.js'
import type { FlowBriefGenerationInput, FlowBriefModelProvider } from './types.js'
import { parseFlowBriefGenerationOutput, validateParsedFlowBriefOutput } from './validate-output.js'
import { assessFlowBriefQuality, mergeWarnings } from './warnings.js'

export class FlowBriefGenerationError extends Error {
  readonly code: 'INVALID_OUTPUT' | 'REPAIR_FAILED'
  readonly errors: string[]

  constructor(message: string, code: 'INVALID_OUTPUT' | 'REPAIR_FAILED', errors: string[]) {
    super(message)
    this.name = 'FlowBriefGenerationError'
    this.code = code
    this.errors = errors
  }
}

export type GenerateFlowBriefOptions = {
  provider: FlowBriefModelProvider
  input: FlowBriefGenerationInput
  promptVersion?: string
  now?: () => string
}

function defaultNow(): string {
  return new Date().toISOString()
}

export async function generateFlowBrief(options: GenerateFlowBriefOptions): Promise<FlowBriefArtifact> {
  const promptVersion = options.promptVersion ?? FLOW_BRIEF_PROMPT_VERSION
  const now = options.now ?? defaultNow
  const prompt = buildGenerateFlowBriefPrompt(options.input, promptVersion)

  const initial = await generateAndParse(options.provider, prompt)
  const initialSemanticErrors = initial.ok ? validateParsedFlowBriefOutput(initial.output) : []

  if (initial.ok && initialSemanticErrors.length === 0) {
    return finalizeArtifact(initial.output, options.provider, promptVersion, now())
  }

  if (!options.provider.repairStructured) {
    throw new FlowBriefGenerationError(
      'Model output could not be validated as a flowbrief',
      'INVALID_OUTPUT',
      initial.ok ? initialSemanticErrors : initial.errors,
    )
  }

  const repairErrors = initial.ok ? initialSemanticErrors : initial.errors
  const repairPrompt = buildRepairFlowBriefPrompt(
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
  const reparsed = parseFlowBriefGenerationOutput(repaired.raw)

  if (!reparsed.ok) {
    throw new FlowBriefGenerationError(
      'Repair attempt did not produce valid flowbrief output',
      'REPAIR_FAILED',
      reparsed.errors,
    )
  }

  const repairedSemanticErrors = validateParsedFlowBriefOutput(reparsed.output)
  if (repairedSemanticErrors.length > 0) {
    throw new FlowBriefGenerationError(
      'Flowbrief still invalid after repair attempt',
      'REPAIR_FAILED',
      repairedSemanticErrors,
    )
  }

  return finalizeArtifact(reparsed.output, options.provider, promptVersion, now())
}

async function generateAndParse(provider: FlowBriefModelProvider, prompt: string) {
  const response = await provider.generateStructured(prompt)
  return parseFlowBriefGenerationOutput(response.raw)
}

function finalizeArtifact(
  output: { brief: FlowBriefArtifact['brief']; warnings: FlowBriefArtifact['warnings'] },
  provider: FlowBriefModelProvider,
  promptVersion: string,
  generatedAt: string,
): FlowBriefArtifact {
  const qualityWarnings = assessFlowBriefQuality(output.brief)
  const warnings = mergeWarnings(output.warnings, qualityWarnings)

  return createFlowBriefArtifact({
    promptVersion,
    brief: output.brief,
    warnings,
    model: {
      provider: provider.provider,
      name: provider.model,
    },
    generatedAt,
  })
}
