import type { FlowDefinition } from './index.js'

function prefixKey(index: number, key: string): string {
  return `f${index}_${key}`
}

export function mergeFlowDefinitions(input: {
  targetSlug: string
  targetTitle: string
  categorySlug?: string | null
  sources: FlowDefinition[]
}): FlowDefinition {
  const { sources } = input
  if (sources.length === 0) {
    throw new Error('Cannot merge zero flow definitions')
  }

  if (sources.length === 1) {
    const source = sources[0]!
    return {
      ...source,
      slug: input.targetSlug,
      title: input.targetTitle,
      categorySlug: input.categorySlug ?? source.categorySlug ?? null,
      seo: source.seo ?? {
        title: input.targetTitle,
        description: input.targetTitle,
      },
    }
  }

  const hubOptions = sources.map((source, index) => ({
    optionKey: `intent_f${index}`,
    label: source.title,
    value: `intent_f${index}`,
    sortOrder: index,
  }))

  const nodes: FlowDefinition['nodes'] = [
    {
      nodeKey: 'entry_intent',
      type: 'question',
      title: 'Waar wil je hulp bij?',
      content: {
        inputType: 'single',
        description: input.targetTitle,
      },
      sortOrder: 0,
      isEntry: true,
      options: hubOptions,
    },
  ]

  const rules: FlowDefinition['rules'] = []
  const results: FlowDefinition['results'] = []

  for (const [index, source] of sources.entries()) {
    const entryNode = source.nodes.find((node) => node.isEntry) ?? source.nodes[0]
    if (!entryNode) continue

    rules.push({
      fromNodeKey: 'entry_intent',
      ruleType: 'branch',
      condition: { '==': [{ var: 'entry_intent' }, `intent_f${index}`] },
      targetNodeKey: prefixKey(index, entryNode.nodeKey),
      priority: 10,
    })

    for (const node of source.nodes) {
      nodes.push({
        ...node,
        nodeKey: prefixKey(index, node.nodeKey),
        isEntry: false,
        options: node.options.map((option, optionIndex) => ({
          ...option,
          optionKey: prefixKey(index, option.optionKey),
          sortOrder: optionIndex,
        })),
        sortOrder: nodes.length,
      })
    }

    for (const rule of source.rules) {
      rules.push({
        ...rule,
        fromNodeKey: prefixKey(index, rule.fromNodeKey),
        targetNodeKey: rule.targetNodeKey ? prefixKey(index, rule.targetNodeKey) : null,
        targetResultKey: rule.targetResultKey ? prefixKey(index, rule.targetResultKey) : null,
      })
    }

    for (const result of source.results) {
      results.push({
        ...result,
        resultKey: prefixKey(index, result.resultKey),
      })
    }
  }

  const primary = sources.reduce((best, current) =>
    current.nodes.length >= best.nodes.length ? current : best,
  )

  return {
    slug: input.targetSlug,
    title: input.targetTitle,
    categorySlug: input.categorySlug ?? primary.categorySlug ?? null,
    seo: primary.seo ?? {
      title: input.targetTitle,
      description: input.targetTitle,
    },
    nodes,
    rules,
    results,
  }
}
