import { describe, expect, it } from 'vitest'
import { mergeFlowDefinitions } from './merge-flow-definitions.js'
import type { FlowDefinition } from './index.js'

const miniFlow = (slug: string, title: string): FlowDefinition => ({
  slug,
  title,
  categorySlug: 'tuin-en-buitenleven',
  seo: { title, description: title },
  nodes: [
    {
      nodeKey: 'start',
      type: 'question',
      title: `${title} vraag`,
      content: { inputType: 'single' },
      sortOrder: 0,
      isEntry: true,
      options: [{ optionKey: 'yes', label: 'Ja', value: 'yes', sortOrder: 0 }],
    },
  ],
  rules: [
    {
      fromNodeKey: 'start',
      ruleType: 'result_map',
      condition: { '==': [{ var: 'start' }, 'yes'] },
      targetResultKey: 'result',
      priority: 100,
    },
  ],
  results: [
    {
      resultKey: 'result',
      title: `${title} advies`,
      body: { summary: 'Advies' },
      ctas: [],
    },
  ],
})

describe('mergeFlowDefinitions', () => {
  it('returns single source with canonical slug', () => {
    const merged = mergeFlowDefinitions({
      targetSlug: 'robotmaaiers',
      targetTitle: 'Robotmaaier kiezen',
      sources: [miniFlow('robotmaaier-gps', 'Robotmaaier GPS')],
    })

    expect(merged.slug).toBe('robotmaaiers')
    expect(merged.nodes).toHaveLength(1)
  })

  it('merges multiple flows behind an intent hub', () => {
    const merged = mergeFlowDefinitions({
      targetSlug: 'robotmaaiers',
      targetTitle: 'Robotmaaier kiezen',
      sources: [
        miniFlow('robotmaaier-gps', 'Robotmaaier GPS'),
        miniFlow('robotmaaier-helling', 'Robotmaaier helling'),
      ],
    })

    expect(merged.nodes[0]?.nodeKey).toBe('entry_intent')
    expect(merged.nodes.length).toBe(3)
    expect(merged.results.length).toBe(2)
    expect(merged.rules.some((rule) => rule.fromNodeKey === 'entry_intent')).toBe(true)
  })
})
