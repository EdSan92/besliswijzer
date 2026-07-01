import { z } from 'zod'

export const nodeTypeSchema = z.enum(['question', 'info', 'lead_capture'])
export const inputTypeSchema = z.enum(['single', 'multi', 'slider', 'text'])
export const ruleTypeSchema = z.enum(['branch', 'result_map', 'skip'])
export const versionStatusSchema = z.enum(['draft', 'published', 'archived'])
export const eventTypeSchema = z.enum([
  'flow_start',
  'step_view',
  'step_complete',
  'flow_complete',
  'cta_click',
  'lead_submit',
])
export const ctaTypeSchema = z.enum(['affiliate', 'download', 'external'])

export const seoMetaSchema = z.object({
  title: z.string(),
  description: z.string(),
  ogImage: z.string().optional(),
})

export const nodeContentSchema = z.object({
  inputType: inputTypeSchema.optional(),
  description: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  placeholder: z.string().optional(),
})

export const flowOptionSchema = z.object({
  id: z.string().uuid().optional(),
  optionKey: z.string(),
  label: z.string(),
  value: z.unknown(),
  sortOrder: z.number().default(0),
})

export const flowNodeSchema = z.object({
  id: z.string().uuid().optional(),
  nodeKey: z.string(),
  type: nodeTypeSchema,
  title: z.string(),
  content: nodeContentSchema.default({}),
  sortOrder: z.number().default(0),
  isEntry: z.boolean().default(false),
  options: z.array(flowOptionSchema).default([]),
})

export const flowRuleSchema = z.object({
  id: z.string().uuid().optional(),
  fromNodeKey: z.string(),
  ruleType: ruleTypeSchema,
  condition: z.record(z.unknown()),
  targetNodeKey: z.string().nullable().optional(),
  targetResultKey: z.string().nullable().optional(),
  priority: z.number().default(0),
})

export const ctaSchema = z.object({
  id: z.string(),
  type: ctaTypeSchema,
  url: z.string().url(),
  label: z.string(),
  trackingId: z.string().optional(),
})

export const flowResultSchema = z.object({
  id: z.string().uuid().optional(),
  resultKey: z.string(),
  title: z.string(),
  body: z.record(z.unknown()).default({}),
  ctas: z.array(ctaSchema).default([]),
})

export const flowSnapshotSchema = z.object({
  flowId: z.string().uuid(),
  versionId: z.string().uuid(),
  versionNumber: z.number(),
  slug: z.string(),
  title: z.string(),
  seo: seoMetaSchema,
  nodes: z.array(flowNodeSchema),
  rules: z.array(flowRuleSchema),
  results: z.array(flowResultSchema),
})

export const stepRequestSchema = z.object({
  sessionId: z.string().uuid(),
  nodeKey: z.string(),
  answer: z.unknown(),
  answers: z.record(z.unknown()).optional(),
})

export const analyticsEventSchema = z.object({
  flowId: z.string().uuid(),
  flowVersionId: z.string().uuid(),
  sessionId: z.string().uuid(),
  eventType: eventTypeSchema,
  nodeKey: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
})

export const analyticsBatchSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(50),
})

export const leadSubmissionSchema = z.object({
  sessionId: z.string().uuid(),
  email: z.string().email(),
  answers: z.record(z.unknown()).default({}),
  honeypot: z.string().optional(),
})

export type NodeType = z.infer<typeof nodeTypeSchema>
export type InputType = z.infer<typeof inputTypeSchema>
export type RuleType = z.infer<typeof ruleTypeSchema>
export type VersionStatus = z.infer<typeof versionStatusSchema>
export type EventType = z.infer<typeof eventTypeSchema>
export type CtaType = z.infer<typeof ctaTypeSchema>
export type SeoMeta = z.infer<typeof seoMetaSchema>
export type NodeContent = z.infer<typeof nodeContentSchema>
export type FlowOption = z.infer<typeof flowOptionSchema>
export type FlowNode = z.infer<typeof flowNodeSchema>
export type FlowRule = z.infer<typeof flowRuleSchema>
export type Cta = z.infer<typeof ctaSchema>
export type FlowResult = z.infer<typeof flowResultSchema>
export type FlowSnapshot = z.infer<typeof flowSnapshotSchema>
export type StepRequest = z.infer<typeof stepRequestSchema>
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>
export type LeadSubmission = z.infer<typeof leadSubmissionSchema>

export type NextStep =
  | { type: 'node'; nodeKey: string; node: FlowNode }
  | { type: 'result'; resultKey: string; result: FlowResult }
  | { type: 'complete' }

export type PublicFlowResponse = {
  flowId: string
  versionId: string
  versionNumber: number
  slug: string
  title: string
  seo: SeoMeta
  entryNode: FlowNode
}

export type StepResponse = {
  next: NextStep
  progress: number
}

export type AnalyticsSummary = {
  starts: number
  completions: number
  completionRate: number
  dropOffByNode: Array<{ nodeKey: string; views: number; completes: number; dropOffRate: number }>
  ctaClicks: number
  leadSubmissions: number
}
