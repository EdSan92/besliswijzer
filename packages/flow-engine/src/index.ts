import jsonLogic from 'json-logic-js'
import type { FlowNode, FlowSnapshot, NextStep } from '@besliswijzer/flow-schema'

function sortRulesByPriority<T extends { priority: number }>(rules: T[]): T[] {
  return [...rules].sort((a, b) => b.priority - a.priority)
}

function getApplicableRules(snapshot: FlowSnapshot, currentNodeKey: string) {
  return sortRulesByPriority(
    snapshot.rules.filter(
      (rule) => rule.fromNodeKey === currentNodeKey || rule.fromNodeKey === '*',
    ),
  )
}

function evaluateCondition(
  condition: Record<string, unknown>,
  answers: Record<string, unknown>,
): boolean {
  try {
    return Boolean(jsonLogic.apply(condition, { answers }))
  } catch {
    return false
  }
}

export function getEntryNode(snapshot: FlowSnapshot): FlowNode | undefined {
  return snapshot.nodes.find((node) => node.isEntry) ?? snapshot.nodes[0]
}

export function getNodeByKey(snapshot: FlowSnapshot, nodeKey: string): FlowNode | undefined {
  return snapshot.nodes.find((node) => node.nodeKey === nodeKey)
}

export function getResultByKey(snapshot: FlowSnapshot, resultKey: string) {
  return snapshot.results.find((result) => result.resultKey === resultKey)
}

export function getNextSequential(snapshot: FlowSnapshot, currentNodeKey: string): string | null {
  const sorted = [...snapshot.nodes].sort((a, b) => a.sortOrder - b.sortOrder)
  const index = sorted.findIndex((node) => node.nodeKey === currentNodeKey)
  if (index === -1 || index >= sorted.length - 1) {
    return null
  }
  return sorted[index + 1]?.nodeKey ?? null
}

export function resolveNext(
  snapshot: FlowSnapshot,
  answers: Record<string, unknown>,
  currentNodeKey: string,
): NextStep {
  const rules = getApplicableRules(snapshot, currentNodeKey)

  for (const rule of rules.filter((r) => r.ruleType === 'result_map')) {
    if (rule.targetResultKey && evaluateCondition(rule.condition, answers)) {
      const result = getResultByKey(snapshot, rule.targetResultKey)
      if (result) {
        return { type: 'result', resultKey: result.resultKey, result }
      }
    }
  }

  for (const rule of rules.filter((r) => r.ruleType === 'branch' || r.ruleType === 'skip')) {
    if (rule.targetNodeKey && evaluateCondition(rule.condition, answers)) {
      const node = getNodeByKey(snapshot, rule.targetNodeKey)
      if (node) {
        return { type: 'node', nodeKey: node.nodeKey, node }
      }
    }
  }

  const nextKey = getNextSequential(snapshot, currentNodeKey)
  if (nextKey) {
    const node = getNodeByKey(snapshot, nextKey)
    if (node) {
      return { type: 'node', nodeKey: node.nodeKey, node }
    }
  }

  for (const rule of sortRulesByPriority(
    snapshot.rules.filter((r) => r.ruleType === 'result_map' && r.fromNodeKey === '*'),
  )) {
    if (rule.targetResultKey && evaluateCondition(rule.condition, answers)) {
      const result = getResultByKey(snapshot, rule.targetResultKey)
      if (result) {
        return { type: 'result', resultKey: result.resultKey, result }
      }
    }
  }

  return { type: 'complete' }
}

export function calculateProgress(snapshot: FlowSnapshot, answeredKeys: string[]): number {
  const questionNodes = snapshot.nodes.filter((n) => n.type === 'question')
  if (questionNodes.length === 0) {
    return 100
  }
  const answered = questionNodes.filter((n) => answeredKeys.includes(n.nodeKey)).length
  return Math.min(100, Math.round((answered / questionNodes.length) * 100))
}

export function validateAnswer(node: FlowNode, answer: unknown): boolean {
  if (node.type === 'info') {
    return true
  }

  if (node.type === 'lead_capture') {
    return typeof answer === 'string' && answer.includes('@')
  }

  const inputType = node.content.inputType ?? 'single'

  switch (inputType) {
    case 'single':
      return node.options.some((opt) => opt.value === answer || opt.optionKey === answer)
    case 'multi':
      return (
        Array.isArray(answer) &&
        answer.every((val) => node.options.some((opt) => opt.value === val || opt.optionKey === val))
      )
    case 'slider':
      return typeof answer === 'number'
    case 'text':
      return typeof answer === 'string' && answer.trim().length > 0
    default:
      return false
  }
}

export function normalizeAnswer(node: FlowNode, answer: unknown): unknown {
  if (node.content.inputType === 'single') {
    const option = node.options.find((opt) => opt.optionKey === answer || opt.value === answer)
    return option?.value ?? answer
  }
  return answer
}
