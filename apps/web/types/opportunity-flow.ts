export type OpportunityFlowNode = {
  nodeKey: string
  type: 'question_single' | 'question_multi' | 'info'
  title: string
  isEntry?: boolean
  options?: Array<{ value: string; label: string }>
}

export type OpportunityFlowRule = {
  fromNodeKey: string
  targetNodeKey?: string
  targetResultKey?: string
  condition?: Record<string, unknown>
}

export type OpportunityFlowResult = {
  resultKey: string
  title: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
}

export type OpportunityFlowDefinition = {
  title: string
  slug: string
  description: string
  seoTitle?: string
  seoDescription?: string
  nodes: OpportunityFlowNode[]
  rules: OpportunityFlowRule[]
  results: OpportunityFlowResult[]
}

export type FlowEdge = {
  fromNodeKey: string
  targetNodeKey?: string
  targetResultKey?: string
  label: string
}
