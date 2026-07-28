import { flowBriefSchema, validateFlowBrief } from '@besliswijzer/flow-compiler'
import {
  flowBriefGenerationOutputSchema,
  type FlowBriefGenerationOutput,
} from './artifact.js'

export type ParsedFlowBriefOutput =
  | { ok: true; output: FlowBriefGenerationOutput }
  | { ok: false; errors: string[]; raw: unknown }

export function parseFlowBriefGenerationOutput(raw: unknown): ParsedFlowBriefOutput {
  const wrapped = flowBriefGenerationOutputSchema.safeParse(raw)
  if (wrapped.success) {
    return { ok: true, output: wrapped.data }
  }

  const direct = flowBriefSchema.safeParse(raw)
  if (direct.success) {
    return {
      ok: true,
      output: {
        brief: direct.data,
        warnings: [],
      },
    }
  }

  const errors = [
    ...wrapped.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
  ]

  return { ok: false, errors, raw }
}

export function validateParsedFlowBriefOutput(output: FlowBriefGenerationOutput): string[] {
  const errors: string[] = []

  for (const issue of validateFlowBrief(output.brief)) {
    errors.push(issue)
  }

  for (const question of output.brief.questions) {
    if (!question.decisionPurpose.trim()) {
      errors.push(`Question "${question.questionKey}" is missing decisionPurpose`)
    }
  }

  return errors
}
