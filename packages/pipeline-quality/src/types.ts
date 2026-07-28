export type QualitySeverity = 'error' | 'warning' | 'info'

export type QualityFinding = {
  ruleCode: string
  severity: QualitySeverity
  artifactKind: string
  field: string
  message: string
}

export type QualityReport = {
  findings: QualityFinding[]
  score: number
  hasBlockingErrors: boolean
}

export type ExistingPageSummary = {
  slug: string
  title: string
  text: string
}
