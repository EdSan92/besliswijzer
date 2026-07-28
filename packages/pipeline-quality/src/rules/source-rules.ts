import type { SourcedClaim } from '../artefacts.js'
import type { QualityFinding } from '../types.js'

const NUMERIC_CLAIM_PATTERN = /\b\d+(?:[.,]\d+)?\s*(?:%|€|eur|kg|cm|mm|w|wh|mah|gb|mb|mhz|ghz|liter|litre|l)\b/iu

export function runSourceClaimRules(claims: SourcedClaim[]): QualityFinding[] {
  const findings: QualityFinding[] = []

  for (const claim of claims) {
    if (claim.requiresSource && !claim.sourceId) {
      findings.push({
        ruleCode: 'SOURCE_MISSING_REFERENCE',
        severity: 'error',
        artifactKind: 'source_claim',
        field: `claims.${claim.id}`,
        message: 'Claim requires a source reference',
      })
    }

    if (NUMERIC_CLAIM_PATTERN.test(claim.text) && !claim.sourceId) {
      findings.push({
        ruleCode: 'SOURCE_UNPROVEN_NUMERIC',
        severity: 'warning',
        artifactKind: 'source_claim',
        field: `claims.${claim.id}`,
        message: 'Numeric claim lacks source reference',
      })
    }
  }

  return findings
}
