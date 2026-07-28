import type { ContentPackage } from '../artefacts.js'
import type { PipelineQualityConfig } from '../config.js'
import type { ExistingPageSummary, QualityFinding } from '../types.js'

export function runSimilarityRules(
  content: ContentPackage,
  existingPages: ExistingPageSummary[],
  config: PipelineQualityConfig,
): QualityFinding[] {
  const findings: QualityFinding[] = []
  const candidateText = [content.metadata.title, content.intro, content.buyingGuide].join('\n')
  const candidateTokens = tokenize(candidateText)

  for (const page of existingPages) {
    if (page.slug === content.slug) {
      continue
    }

    const similarity = jaccardSimilarity(candidateTokens, tokenize(`${page.title}\n${page.text}`))
    if (similarity >= config.pageSimilarityThreshold) {
      findings.push({
        ruleCode: 'SIMILARITY_PAGE_OVERLAP',
        severity: 'warning',
        artifactKind: 'content_package',
        field: 'content',
        message: `High overlap (${similarity.toFixed(2)}) with existing page "${page.slug}"`,
      })
    }
  }

  return findings
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length > 2),
  )
}

function jaccardSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0
  }

  let intersection = 0
  for (const token of left) {
    if (right.has(token)) {
      intersection += 1
    }
  }

  const union = new Set([...left, ...right]).size
  return union === 0 ? 0 : intersection / union
}
