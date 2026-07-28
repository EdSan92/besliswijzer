import { z } from 'zod'

export const flowBriefOptionSchema = z.object({
  optionKey: z.string().min(1),
  label: z.string().min(1),
  value: z.unknown(),
})

export const flowBriefQuestionSchema = z.object({
  questionKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  inputType: z.enum(['single', 'multi']).default('single'),
  decisionPurpose: z.string().min(1),
  options: z.array(flowBriefOptionSchema).min(1),
})

export const flowBriefDecisionRuleSchema = z.object({
  fromQuestionKey: z.string().min(1),
  condition: z.record(z.unknown()).default({}),
  targetQuestionKey: z.string().nullable().optional(),
  targetResultKey: z.string().nullable().optional(),
  priority: z.number().optional(),
})

export const flowBriefResultSchema = z.object({
  resultKey: z.string().min(1),
  title: z.string().min(1),
  body: z.record(z.unknown()).default({}),
  ctas: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.enum(['affiliate', 'download', 'external']),
        url: z.string().url(),
        label: z.string().min(1),
        trackingId: z.string().optional(),
      }),
    )
    .default([]),
})

export const flowBriefMetadataSchema = z.object({
  targetAudience: z.string().min(1),
  problem: z.string().min(1),
  searchIntent: z.string().min(1),
  exclusions: z.array(z.string()).default([]),
  buyingCriteria: z.array(z.string()).default([]),
  requiredProductFields: z.array(z.string()).default([]),
})

export const flowBriefSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(1),
  categorySlug: z.string().optional().nullable(),
  seo: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
    })
    .optional(),
  metadata: flowBriefMetadataSchema,
  questions: z.array(flowBriefQuestionSchema).min(1),
  decisionRules: z.array(flowBriefDecisionRuleSchema).default([]),
  results: z.array(flowBriefResultSchema).min(1),
  includeLeadCapture: z.boolean().default(false),
})

export type FlowBrief = z.infer<typeof flowBriefSchema>
export type FlowBriefQuestion = z.infer<typeof flowBriefQuestionSchema>
export type FlowBriefDecisionRule = z.infer<typeof flowBriefDecisionRuleSchema>
export type FlowBriefResult = z.infer<typeof flowBriefResultSchema>

const LEAD_CAPTURE_QUESTION_KEY = 'lead'

export function validateFlowBrief(brief: FlowBrief): string[] {
  const errors: string[] = []
  const rawQuestionKeys = brief.questions.map((question) => question.questionKey)
  const questionKeys = new Set(rawQuestionKeys)
  const resultKeys = new Set(brief.results.map((result) => result.resultKey))

  if (questionKeys.size !== rawQuestionKeys.length) {
    errors.push('Question keys must be unique')
  }
  if (resultKeys.size !== brief.results.length) {
    errors.push('Result keys must be unique')
  }

  if (brief.includeLeadCapture) {
    questionKeys.add(LEAD_CAPTURE_QUESTION_KEY)
  }

  for (const question of brief.questions) {
    const optionKeys = new Set(question.options.map((option) => option.optionKey))
    if (optionKeys.size !== question.options.length) {
      errors.push(`Duplicate option keys on question "${question.questionKey}"`)
    }
  }

  for (const rule of brief.decisionRules) {
    if (!questionKeys.has(rule.fromQuestionKey)) {
      errors.push(`Decision rule references unknown fromQuestionKey "${rule.fromQuestionKey}"`)
    }
    if (rule.targetQuestionKey && !questionKeys.has(rule.targetQuestionKey)) {
      errors.push(`Decision rule references unknown targetQuestionKey "${rule.targetQuestionKey}"`)
    }
    if (rule.targetResultKey && !resultKeys.has(rule.targetResultKey)) {
      errors.push(`Decision rule references unknown targetResultKey "${rule.targetResultKey}"`)
    }
    if (!rule.targetQuestionKey && !rule.targetResultKey) {
      errors.push(`Decision rule from "${rule.fromQuestionKey}" needs a target`)
    }
    if (rule.targetQuestionKey && rule.targetResultKey) {
      errors.push(`Decision rule from "${rule.fromQuestionKey}" cannot target both a question and a result`)
    }
  }

  return errors
}
