import { flowBriefSchema } from '@besliswijzer/flow-compiler'
import { flowDefinitionSchema } from '@besliswijzer/flow-schema'
import { contentPackageSchema } from '@besliswijzer/pipeline-quality'
import type { ZodError } from 'zod'
import type { UpdateArtifactBody } from './review.js'

export type ArtifactValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] }

function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

function validateFlowBriefPayload(payload: unknown): ArtifactValidationResult {
  if (payload && typeof payload === 'object' && 'brief' in payload) {
    const parsed = flowBriefSchema.safeParse((payload as { brief: unknown }).brief)
    return parsed.success
      ? { ok: true }
      : { ok: false, errors: formatZodErrors(parsed.error) }
  }

  const direct = flowBriefSchema.safeParse(payload)
  return direct.success ? { ok: true } : { ok: false, errors: formatZodErrors(direct.error) }
}

function validateContentPackagePayload(payload: unknown): ArtifactValidationResult {
  if (payload && typeof payload === 'object' && 'content' in payload) {
    const parsed = contentPackageSchema.safeParse((payload as { content: unknown }).content)
    return parsed.success
      ? { ok: true }
      : { ok: false, errors: formatZodErrors(parsed.error) }
  }

  const direct = contentPackageSchema.safeParse(payload)
  return direct.success ? { ok: true } : { ok: false, errors: formatZodErrors(direct.error) }
}

function validateCompiledFlowPayload(payload: unknown): ArtifactValidationResult {
  if (payload && typeof payload === 'object' && 'flow' in payload) {
    const parsed = flowDefinitionSchema.safeParse((payload as { flow: unknown }).flow)
    return parsed.success
      ? { ok: true }
      : { ok: false, errors: formatZodErrors(parsed.error) }
  }

  const direct = flowDefinitionSchema.safeParse(payload)
  return direct.success ? { ok: true } : { ok: false, errors: formatZodErrors(direct.error) }
}

export function validateArtifactCorrectionPayload(
  kind: UpdateArtifactBody['kind'],
  payload: unknown,
): ArtifactValidationResult {
  switch (kind) {
    case 'flow_brief':
      return validateFlowBriefPayload(payload)
    case 'content_package':
      return validateContentPackagePayload(payload)
    case 'compiled_flow':
      return validateCompiledFlowPayload(payload)
    default:
      return { ok: false, errors: [`Unsupported artifact kind: ${kind as string}`] }
  }
}
