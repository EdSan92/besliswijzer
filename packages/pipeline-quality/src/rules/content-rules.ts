import type { ContentPackage } from '../artefacts.js'
import type { PipelineQualityConfig } from '../config.js'
import type { QualityFinding } from '../types.js'

function errorFinding(field: string, message: string): QualityFinding {
  return {
    ruleCode: 'CONTENT_SECTION_MISSING',
    severity: 'error',
    artifactKind: 'content_package',
    field,
    message,
  }
}

function warningFinding(ruleCode: string, field: string, message: string): QualityFinding {
  return {
    ruleCode,
    severity: 'warning',
    artifactKind: 'content_package',
    field,
    message,
  }
}

export function runContentPackageRules(
  content: ContentPackage,
  config: PipelineQualityConfig,
): QualityFinding[] {
  const findings: QualityFinding[] = []

  if (!content.intro.trim()) {
    findings.push(errorFinding('intro', 'Intro section is required'))
  }
  if (!content.buyingGuide.trim()) {
    findings.push(errorFinding('buyingGuide', 'Buying guide section is required'))
  }
  if (content.faq.length === 0) {
    findings.push(errorFinding('faq', 'At least one FAQ entry is required'))
  }

  if (content.metadata.title.trim().length < config.minMetadataTitleLength) {
    findings.push(
      warningFinding(
        'CONTENT_METADATA_TITLE_SHORT',
        'metadata.title',
        `Title is shorter than ${config.minMetadataTitleLength} characters`,
      ),
    )
  }

  if (content.metadata.description.trim().length < config.minMetadataDescriptionLength) {
    findings.push(
      warningFinding(
        'CONTENT_METADATA_DESCRIPTION_SHORT',
        'metadata.description',
        `Description is shorter than ${config.minMetadataDescriptionLength} characters`,
      ),
    )
  }

  const seenQuestions = new Set<string>()
  for (const [index, item] of content.faq.entries()) {
    if (!item.answer.trim()) {
      findings.push(
        errorFinding(`faq[${index}].answer`, `FAQ answer ${index + 1} must not be empty`),
      )
    }

    const normalizedQuestion = item.question.trim().toLowerCase()
    if (seenQuestions.has(normalizedQuestion)) {
      findings.push(
        warningFinding(
          'CONTENT_DUPLICATE_FAQ',
          `faq[${index}].question`,
          `Duplicate FAQ question: "${item.question}"`,
        ),
      )
    }
    seenQuestions.add(normalizedQuestion)
  }

  for (const pattern of config.forbiddenPlaceholders) {
    const haystack = [content.intro, content.buyingGuide, content.metadata.title, content.metadata.description]
      .concat(content.faq.flatMap((item) => [item.question, item.answer]))
      .join('\n')
      .toLowerCase()

    if (haystack.includes(pattern.toLowerCase())) {
      findings.push(
        warningFinding(
          'CONTENT_FORBIDDEN_PLACEHOLDER',
          'content',
          `Forbidden placeholder "${pattern}" detected`,
        ),
      )
    }
  }

  return findings
}
