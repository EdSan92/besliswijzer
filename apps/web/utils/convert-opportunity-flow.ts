import type { FlowDefinition } from '@besliswijzer/flow-schema'
import { normalizeJsonLogicCondition } from '@besliswijzer/flow-engine'
import type { OpportunityFlowDefinition, OpportunityFlowRule } from '~/types/opportunity-flow'

type FlowDefinitionNode = FlowDefinition['nodes'][number]

function sanitizeSlug(slug: string): string {
  const cleaned = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/\d+$/g, '')
    .replace(/-+$/g, '')

  return cleaned.slice(0, 80) || 'keuzehulp'
}

function convertRule(rule: OpportunityFlowRule, index: number) {
  const isResult = Boolean(rule.targetResultKey)
  return {
    fromNodeKey: rule.fromNodeKey,
    ruleType: isResult ? ('result_map' as const) : ('branch' as const),
    condition: normalizeJsonLogicCondition(rule.condition ?? {}, rule.fromNodeKey),
    targetNodeKey: rule.targetNodeKey ?? null,
    targetResultKey: rule.targetResultKey ?? null,
    priority: isResult ? 100 - index : 10,
  }
}

export function resolveImportedFlowSlug(flow: OpportunityFlowDefinition): string {
  return sanitizeSlug(flow.slug)
}

export function convertOpportunityFlowToBesliswijzer(
  flow: OpportunityFlowDefinition,
  categorySlug?: string | null,
): FlowDefinition {
  const slug = sanitizeSlug(flow.slug)
  let entrySet = false

  const nodes = flow.nodes.map((node, index) => {
    const isEntry = node.isEntry === true || (!entrySet && index === 0)
    if (isEntry) entrySet = true

    const inputType: 'single' | 'multi' | undefined =
      node.type === 'question_multi' ? 'multi' : node.type === 'question_single' ? 'single' : undefined

    const content: FlowDefinitionNode['content'] = inputType
      ? { inputType, description: flow.description }
      : { description: flow.description }

    return {
      nodeKey: node.nodeKey,
      type: node.type === 'info' ? ('info' as const) : ('question' as const),
      title: node.title,
      content,
      sortOrder: index,
      isEntry,
      options: (node.options ?? []).map((option, optionIndex) => ({
        optionKey: option.value,
        label: option.label,
        value: option.value,
        sortOrder: optionIndex,
      })),
    }
  })

  const results = flow.results.map((result) => ({
    resultKey: result.resultKey,
    title: result.title,
    body: {
      summary: result.body,
    },
    ctas: result.ctaUrl
      ? [
          {
            id: `${result.resultKey}-cta`,
            type: 'affiliate' as const,
            url: result.ctaUrl,
            label: result.ctaLabel ?? 'Bekijk aanbeveling',
          },
        ]
      : [],
  }))

  const rules = flow.rules.map((rule, index) => convertRule(rule, index))

  return {
    slug,
    title: flow.title,
    categorySlug: categorySlug ?? null,
    seo: {
      title: flow.seoTitle ?? flow.title,
      description: flow.seoDescription ?? flow.description,
    },
    nodes,
    rules,
    results,
  }
}
