import { normalizeJsonLogicCondition } from '@besliswijzer/flow-engine'
import {
  flowDefinitionSchema,
  validateFlowDefinition,
  type FlowDefinition,
} from '@besliswijzer/flow-schema'
import {
  flowBriefSchema,
  validateFlowBrief,
  type FlowBrief,
  type FlowBriefDecisionRule,
  type FlowBriefQuestion,
} from './flowbrief-schema.js'
import { createCompiledFlowArtefact, type CompiledFlowArtefact } from './pipeline-artefact.js'
import { sanitizeKey, sanitizeSlug } from './slug-keys.js'
import { validateFlowGraph } from './validate-flow-graph.js'

const LEAD_CAPTURE_NODE_KEY = 'lead'

export type CompileFlowBriefSuccess = {
  ok: true
  flow: FlowDefinition
  artefact: CompiledFlowArtefact
}

export type CompileFlowBriefFailure = {
  ok: false
  errors: string[]
}

export type CompileFlowBriefResult = CompileFlowBriefSuccess | CompileFlowBriefFailure

export function compileFlowBrief(input: unknown): CompileFlowBriefResult {
  const parsed = flowBriefSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    }
  }

  const briefErrors = validateFlowBrief(parsed.data)
  if (briefErrors.length > 0) {
    return { ok: false, errors: briefErrors }
  }

  const flow = buildFlowDefinition(parsed.data)
  const schemaErrors = validateCompiledFlow(flow)
  if (schemaErrors.length > 0) {
    return { ok: false, errors: schemaErrors }
  }

  return {
    ok: true,
    flow,
    artefact: createCompiledFlowArtefact(flow),
  }
}

function validateCompiledFlow(flow: FlowDefinition): string[] {
  const parsed = flowDefinitionSchema.safeParse(flow)
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
  }

  return [...validateFlowDefinition(parsed.data), ...validateFlowGraph(parsed.data)]
}

function buildFlowDefinition(brief: FlowBrief): FlowDefinition {
  const slug = sanitizeSlug(brief.slug)
  const questionKeys = brief.questions.map((question) => sanitizeKey(question.questionKey))
  const keyByOriginal = new Map(
    brief.questions.map((question, index) => [question.questionKey, questionKeys[index]!]),
  )
  if (brief.includeLeadCapture) {
    keyByOriginal.set('lead', LEAD_CAPTURE_NODE_KEY)
  }

  const nodes = brief.questions.map((question, index) => mapQuestionToNode(question, index, index === 0))

  if (brief.includeLeadCapture) {
    nodes.push({
      nodeKey: LEAD_CAPTURE_NODE_KEY,
      type: 'lead_capture',
      title: 'Advies per e-mail ontvangen?',
      content: {
        description: 'Optioneel — ontvang een korte samenvatting met jouw beste match.',
      },
      sortOrder: nodes.length,
      isEntry: false,
      options: [],
    })
  }

  const results = brief.results.map((result) => ({
    resultKey: sanitizeKey(result.resultKey),
    title: result.title,
    body: result.body,
    ctas: result.ctas,
  }))

  const rules = buildRules(brief, keyByOriginal, questionKeys, brief.includeLeadCapture)

  return {
    slug,
    title: brief.title,
    categorySlug: brief.categorySlug ? sanitizeSlug(brief.categorySlug) : null,
    seo: brief.seo ?? {
      title: brief.title,
      description: brief.metadata.searchIntent,
    },
    nodes,
    rules,
    results,
  }
}

function mapQuestionToNode(
  question: FlowBriefQuestion,
  sortOrder: number,
  isEntry: boolean,
): FlowDefinition['nodes'][number] {
  return {
    nodeKey: sanitizeKey(question.questionKey),
    type: 'question',
    title: question.title,
    content: {
      inputType: question.inputType,
      description: question.description ?? question.decisionPurpose,
    },
    sortOrder,
    isEntry,
    options: question.options.map((option, optionIndex) => ({
      optionKey: sanitizeKey(option.optionKey),
      label: option.label,
      value: option.value,
      sortOrder: optionIndex,
    })),
  }
}

function buildRules(
  brief: FlowBrief,
  keyByOriginal: Map<string, string>,
  questionKeys: string[],
  includeLeadCapture: boolean,
): FlowDefinition['rules'] {
  const rules: FlowDefinition['rules'] = []
  const explicitBranchSources = new Set<string>()

  for (const [index, rule] of brief.decisionRules.entries()) {
    const mapped = mapDecisionRule(rule, keyByOriginal, index)
    rules.push(mapped)
    if (mapped.ruleType === 'branch') {
      explicitBranchSources.add(mapped.fromNodeKey)
    }
  }

  const orderedQuestionKeys = questionKeys
  for (let index = 0; index < orderedQuestionKeys.length; index += 1) {
    const fromKey = orderedQuestionKeys[index]!
    const nextKey = orderedQuestionKeys[index + 1]
    const branchTarget = nextKey ?? (includeLeadCapture ? LEAD_CAPTURE_NODE_KEY : null)

    if (!branchTarget || explicitBranchSources.has(fromKey)) {
      continue
    }

    rules.push({
      fromNodeKey: fromKey,
      ruleType: 'branch',
      condition: normalizeJsonLogicCondition({}, fromKey),
      targetNodeKey: branchTarget,
      priority: 10,
    })
    explicitBranchSources.add(fromKey)
  }

  return stableRules(rules)
}

function mapDecisionRule(
  rule: FlowBriefDecisionRule,
  keyByOriginal: Map<string, string>,
  index: number,
): FlowDefinition['rules'][number] {
  const fromNodeKey = keyByOriginal.get(rule.fromQuestionKey) ?? sanitizeKey(rule.fromQuestionKey)
  const targetNodeKey = rule.targetQuestionKey
    ? (keyByOriginal.get(rule.targetQuestionKey) ?? sanitizeKey(rule.targetQuestionKey))
    : null
  const targetResultKey = rule.targetResultKey ? sanitizeKey(rule.targetResultKey) : null
  const isResult = Boolean(targetResultKey)

  return {
    fromNodeKey,
    ruleType: isResult ? 'result_map' : 'branch',
    condition: normalizeJsonLogicCondition(rule.condition ?? {}, fromNodeKey),
    targetNodeKey: isResult ? null : targetNodeKey,
    targetResultKey,
    priority: rule.priority ?? (isResult ? 100 - index : 10),
  }
}

function stableRules(rules: FlowDefinition['rules']): FlowDefinition['rules'] {
  return [...rules].sort((left, right) => {
    if (left.fromNodeKey !== right.fromNodeKey) {
      return left.fromNodeKey.localeCompare(right.fromNodeKey)
    }
    if (left.priority !== right.priority) {
      return right.priority - left.priority
    }
    const leftTarget = left.targetNodeKey ?? left.targetResultKey ?? ''
    const rightTarget = right.targetNodeKey ?? right.targetResultKey ?? ''
    return leftTarget.localeCompare(rightTarget)
  })
}
