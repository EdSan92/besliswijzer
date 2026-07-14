import type {
  FlowEdge,
  OpportunityFlowDefinition,
  OpportunityFlowNode,
  OpportunityFlowRule,
} from '~/types/opportunity-flow'

const NODE_TYPE_LABEL: Record<OpportunityFlowNode['type'], string> = {
  question_single: 'Enkele keuze',
  question_multi: 'Meerkeuze',
  info: 'Info',
}

export function isOpportunityFlowDefinition(value: unknown): value is OpportunityFlowDefinition {
  if (!value || typeof value !== 'object') return false
  const flow = value as OpportunityFlowDefinition
  return (
    typeof flow.title === 'string' &&
    typeof flow.slug === 'string' &&
    Array.isArray(flow.nodes) &&
    Array.isArray(flow.rules) &&
    Array.isArray(flow.results)
  )
}

export function nodeTypeLabel(type: OpportunityFlowNode['type']): string {
  return NODE_TYPE_LABEL[type] ?? type
}

export function findEntryNode(nodes: OpportunityFlowNode[]): OpportunityFlowNode | undefined {
  return nodes.find((node) => node.isEntry) ?? nodes[0]
}

export function formatFlowCondition(
  condition: Record<string, unknown> | undefined,
  nodes: OpportunityFlowNode[],
): string {
  if (!condition || Object.keys(condition).length === 0) return 'altijd'

  const operator = Object.keys(condition)[0]
  const operands = condition[operator]
  if (!Array.isArray(operands) || operands.length < 2) {
    return 'voorwaarde'
  }

  const left = operands[0]
  const right = operands[1]

  const answerRef =
    typeof left === 'object' && left !== null && 'var' in left
      ? String((left as { var: string }).var)
      : null
  const answerValue = typeof right === 'string' ? right : JSON.stringify(right)

  const nodeKey = answerRef?.replace(/^answers\./, '')
  const node = nodes.find((item) => item.nodeKey === nodeKey)
  const optionLabel = node?.options?.find((option) => option.value === answerValue)?.label

  const valueLabel = optionLabel ?? answerValue

  switch (operator) {
    case '==':
      return `als "${valueLabel}"`
    case '!=':
      return `als niet "${valueLabel}"`
    case '>':
      return `als > ${valueLabel}`
    case '>=':
      return `als ≥ ${valueLabel}`
    case '<':
      return `als < ${valueLabel}`
    case '<=':
      return `als ≤ ${valueLabel}`
    default:
      return 'voorwaarde'
  }
}

export function buildFlowEdges(
  rules: OpportunityFlowRule[],
  nodes: OpportunityFlowNode[],
): FlowEdge[] {
  return rules.map((rule) => ({
    fromNodeKey: rule.fromNodeKey,
    targetNodeKey: rule.targetNodeKey,
    targetResultKey: rule.targetResultKey,
    label: formatFlowCondition(rule.condition, nodes),
  }))
}

export function orderNodesByFlow(
  nodes: OpportunityFlowNode[],
  edges: FlowEdge[],
): OpportunityFlowNode[] {
  const entry = findEntryNode(nodes)
  if (!entry) return nodes

  const ordered: OpportunityFlowNode[] = []
  const seen = new Set<string>()
  const queue = [entry.nodeKey]

  while (queue.length > 0) {
    const key = queue.shift()
    if (!key || seen.has(key)) continue

    const node = nodes.find((item) => item.nodeKey === key)
    if (!node) continue

    ordered.push(node)
    seen.add(key)

    for (const edge of edges) {
      if (edge.fromNodeKey !== key || !edge.targetNodeKey || seen.has(edge.targetNodeKey)) continue
      queue.push(edge.targetNodeKey)
    }
  }

  for (const node of nodes) {
    if (!seen.has(node.nodeKey)) ordered.push(node)
  }

  return ordered
}
