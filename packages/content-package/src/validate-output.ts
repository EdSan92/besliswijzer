import {
  contentPackageSchema,
  DEFAULT_PIPELINE_QUALITY_CONFIG,
  runContentPackageRules,
} from '@besliswijzer/pipeline-quality'
import {
  contentPackageGenerationOutputSchema,
  type ContentPackageGenerationOutput,
} from './artifact.js'

export type ParsedContentPackageOutput =
  | { ok: true; output: ContentPackageGenerationOutput }
  | { ok: false; errors: string[]; raw: unknown }

export function parseContentPackageGenerationOutput(raw: unknown): ParsedContentPackageOutput {
  const wrapped = contentPackageGenerationOutputSchema.safeParse(raw)
  if (wrapped.success) {
    return { ok: true, output: wrapped.data }
  }

  const direct = contentPackageSchema.safeParse(raw)
  if (direct.success) {
    return {
      ok: true,
      output: {
        content: direct.data,
        internalLinks: [],
        claims: [],
        warnings: [],
      },
    }
  }

  const errors = wrapped.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  )

  return { ok: false, errors, raw }
}

export function validateParsedContentPackageOutput(
  output: ContentPackageGenerationOutput,
): string[] {
  const errors: string[] = []

  for (const finding of runContentPackageRules(output.content, DEFAULT_PIPELINE_QUALITY_CONFIG)) {
    if (finding.severity === 'error') {
      errors.push(`${finding.field}: ${finding.message}`)
    }
  }

  for (const [index, claim] of output.claims.entries()) {
    if (!claim.text.trim()) {
      errors.push(`claims[${index}].text: Claim text must not be empty`)
    }
  }

  for (const [index, link] of output.internalLinks.entries()) {
    if (!link.slug.trim() || !link.title.trim() || !link.reason.trim()) {
      errors.push(`internalLinks[${index}]: Internal link suggestion must include slug, title and reason`)
    }
  }

  return errors
}
