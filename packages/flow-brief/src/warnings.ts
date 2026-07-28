import { z } from 'zod'
import type { FlowBrief } from '@besliswijzer/flow-compiler'

export const flowBriefWarningSchema = z.object({
  code: z.string().min(1),
  field: z.string().min(1),
  message: z.string().min(1),
})

export type FlowBriefWarning = z.infer<typeof flowBriefWarningSchema>

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function optionSignature(question: FlowBrief['questions'][number]): string {
  return question.options
    .map((option) => normalizeText(option.label))
    .sort()
    .join('|')
}

export function assessFlowBriefQuality(brief: FlowBrief): FlowBriefWarning[] {
  const warnings: FlowBriefWarning[] = []
  const seenTitles = new Map<string, string>()
  const seenPurposes = new Map<string, string>()
  const seenOptionSets = new Map<string, string>()

  for (const question of brief.questions) {
    const normalizedTitle = normalizeText(question.title)
    const previousTitle = seenTitles.get(normalizedTitle)
    if (previousTitle) {
      warnings.push({
        code: 'DUPLICATE_QUESTION_TITLE',
        field: `questions.${question.questionKey}.title`,
        message: `Duplicate question title also used by "${previousTitle}"`,
      })
    } else {
      seenTitles.set(normalizedTitle, question.questionKey)
    }

    const normalizedPurpose = normalizeText(question.decisionPurpose)
    const previousPurpose = seenPurposes.get(normalizedPurpose)
    if (previousPurpose) {
      warnings.push({
        code: 'DUPLICATE_DECISION_PURPOSE',
        field: `questions.${question.questionKey}.decisionPurpose`,
        message: `Duplicate decision purpose also used by "${previousPurpose}"`,
      })
    } else {
      seenPurposes.set(normalizedPurpose, question.questionKey)
    }

    if (question.options.length < 2) {
      warnings.push({
        code: 'NON_DISCRIMINATING_QUESTION',
        field: `questions.${question.questionKey}.options`,
        message: 'Question needs at least two options to discriminate answers',
      })
    }

    const signature = optionSignature(question)
    const previousQuestion = seenOptionSets.get(signature)
    if (previousQuestion) {
      warnings.push({
        code: 'NON_DISCRIMINATING_OPTIONS',
        field: `questions.${question.questionKey}.options`,
        message: `Option set matches question "${previousQuestion}"`,
      })
    } else {
      seenOptionSets.set(signature, question.questionKey)
    }
  }

  for (const result of brief.results) {
    const summary = typeof result.body.summary === 'string' ? result.body.summary : ''
    if (/(\bbeste\b|\b#1\b|\bnummer 1\b)/iu.test(summary)) {
      warnings.push({
        code: 'UNVERIFIED_PRODUCT_CLAIM',
        field: `results.${result.resultKey}.body.summary`,
        message: 'Result summary contains a superlative claim that requires explicit source backing',
      })
    }
  }

  return warnings
}

export function mergeWarnings(
  ...groups: FlowBriefWarning[][]
): FlowBriefWarning[] {
  const merged: FlowBriefWarning[] = []
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
