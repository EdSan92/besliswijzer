import type { QualityReport } from './types.js'

export function canPublish(report: QualityReport): boolean {
  return !report.hasBlockingErrors
}

export function assertPublishAllowed(report: QualityReport): void {
  if (!canPublish(report)) {
    const blocking = report.findings.filter((finding) => finding.severity === 'error')
    throw new Error(
      `Publication blocked by ${blocking.length} quality error(s): ${blocking
        .map((finding) => finding.ruleCode)
        .join(', ')}`,
    )
  }
}
