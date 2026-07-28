import type { QualityFinding } from './types.js'

export function sortFindings(findings: QualityFinding[]): QualityFinding[] {
  return [...findings].sort((left, right) => {
    if (left.ruleCode !== right.ruleCode) {
      return left.ruleCode.localeCompare(right.ruleCode)
    }
    if (left.artifactKind !== right.artifactKind) {
      return left.artifactKind.localeCompare(right.artifactKind)
    }
    if (left.field !== right.field) {
      return left.field.localeCompare(right.field)
    }
    return left.message.localeCompare(right.message)
  })
}

export function calculateQualityScore(
  findings: QualityFinding[],
  config: { warningScorePenalty: number; infoScorePenalty: number },
): number {
  let score = 100

  for (const finding of findings) {
    if (finding.severity === 'warning') {
      score -= config.warningScorePenalty
    }
    if (finding.severity === 'info') {
      score -= config.infoScorePenalty
    }
  }

  return Math.max(0, score)
}

export function buildQualityReport(
  findings: QualityFinding[],
  config: { warningScorePenalty: number; infoScorePenalty: number },
): {
  findings: QualityFinding[]
  score: number
  hasBlockingErrors: boolean
} {
  const sorted = sortFindings(findings)
  const hasBlockingErrors = sorted.some((finding) => finding.severity === 'error')

  return {
    findings: sorted,
    score: calculateQualityScore(sorted, config),
    hasBlockingErrors,
  }
}
