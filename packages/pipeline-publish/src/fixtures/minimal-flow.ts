import type { FlowDefinition } from '@besliswijzer/flow-schema'
import { FLOW_COMPILER_VERSION } from '@besliswijzer/flow-compiler'

export const minimalFlow: FlowDefinition = {
  slug: 'airfryers',
  title: 'Airfryer keuzehulp',
  categorySlug: null,
  nodes: [
    {
      nodeKey: 'budget',
      type: 'question',
      title: 'Budget?',
      content: { inputType: 'single' },
      sortOrder: 0,
      isEntry: true,
      options: [
        { optionKey: 'laag', label: 'Laag', value: 'laag', sortOrder: 0 },
        { optionKey: 'hoog', label: 'Hoog', value: 'hoog', sortOrder: 1 },
      ],
    },
  ],
  rules: [
    {
      fromNodeKey: 'budget',
      ruleType: 'result_map',
      condition: {},
      targetResultKey: 'advies',
      priority: 1,
    },
  ],
  results: [
    {
      resultKey: 'advies',
      title: 'Advies',
      body: { summary: 'Kies passend model.' },
      ctas: [],
    },
  ],
}

export const minimalCompiledFlowPayload = {
  kind: 'compiled_flow',
  compilerVersion: FLOW_COMPILER_VERSION,
  flow: minimalFlow,
}
