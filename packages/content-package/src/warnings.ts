import { z } from 'zod'
import {
  DEFAULT_PIPELINE_QUALITY_CONFIG,
  runContentPackageRules,
  type ContentPackage,
  type SourcedClaim,
} from '@besliswijzer/pipeline-quality'

export const contentPackageWarningSchema = z.object({
  code: z.string().min(1),
  field: z.string().min(1),
  message: z.string().min(1),
})

export type ContentPackageWarning = z.infer<typeof contentPackageWarningSchema>

export function assessContentPackageQuality(
  content: ContentPackage,
  claims: SourcedClaim[] = [],
): ContentPackageWarning[] {
  const warnings: ContentPackageWarning[] = []

  for (const finding of runContentPackageRules(content, DEFAULT_PIPELINE_QUALITY_CONFIG)) {
    if (finding.severity === 'warning') {
      warnings.push({
        code: finding.ruleCode,
        field: finding.field,
        message: finding.message,
      })
    }
  }

  for (const claim of claims) {
    if (claim.requiresSource && !claim.sourceId?.trim()) {
      warnings.push({
        code: 'NEEDS_VERIFICATION',
        field: `claims.${claim.id}`,
        message: `Claim "${claim.id}" requires source verification before publication`,
      })
    }
  }

  return warnings
}

export function mergeWarnings(
  ...groups: ContentPackageWarning[][]
): ContentPackageWarning[] {
  const merged: ContentPackageWarning[] = []
  const seen = new Set<string>()

  for (const group of groups) {
    for (const warning of group) {
      const key = `${warning.code}:${warning.field}:${warning.message}`
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      merged.push(warning)
    }
  }

  return merged
}
