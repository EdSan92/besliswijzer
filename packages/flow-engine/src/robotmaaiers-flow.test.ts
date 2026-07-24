import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { FlowDefinition, FlowSnapshot } from '@besliswijzer/flow-schema'
import { resolveNext } from './index.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const robotFlowPath = resolve(
  repoRoot,
  'flows/examples/robot-grasmaaier-keuzehulp.json',
)

function loadRobotSnapshot(): FlowSnapshot {
  const raw = JSON.parse(readFileSync(robotFlowPath, 'utf8')) as { flow: FlowDefinition }
  const flow = raw.flow

  return {
    flowId: '00000000-0000-0000-0000-000000000001',
    versionId: '00000000-0000-0000-0000-000000000002',
    versionNumber: 1,
    slug: flow.slug,
    title: flow.title,
    seo: flow.seo ?? { title: flow.title, description: flow.title },
    nodes: flow.nodes.map((node) => ({
      ...node,
      id: node.nodeKey,
      options: (node.options ?? []).map((option) => ({
        ...option,
        id: option.optionKey,
      })),
    })),
    rules: flow.rules.map((rule) => ({ ...rule, id: `${rule.fromNodeKey}-${rule.priority}` })),
    results: flow.results.map((result) => ({ ...result, id: result.resultKey })),
  }
}

function completeFlow(snapshot: FlowSnapshot, answers: Record<string, unknown>) {
  let nodeKey = snapshot.nodes.find((node) => node.isEntry)?.nodeKey
  expect(nodeKey).toBeTruthy()

  while (nodeKey) {
    const next = resolveNext(snapshot, answers, nodeKey)
    if (next.type === 'result') {
      return next
    }
    if (next.type !== 'node') {
      throw new Error(`Unexpected next step after ${nodeKey}`)
    }
    nodeKey = next.node.nodeKey
  }

  throw new Error('Flow ended without result')
}

describe('robotmaaiers reference flow', () => {
  const snapshot = loadRobotSnapshot()

  it('loads the published robotmaaier flow definition', () => {
    expect(snapshot.slug).toBe('robotmaaiers')
    expect(snapshot.nodes.filter((node) => node.type === 'question')).toHaveLength(6)
    expect(snapshot.results).toHaveLength(4)
  })

  it('routes a small flat garden with budget preference to instap advice', () => {
    const next = completeFlow(snapshot, {
      grootte: 'klein',
      helling: 'vlak',
      obstakels: 'open',
      wensen: 'budget',
      stroom: 'dichtbij',
      kabel: 'geen_probleem',
      lead: '',
    })

    expect(next.resultKey).toBe('advies_instap')
    expect(next.result.title).toBe('Instap robotmaaier')
    expect(next.result.ctas[0]?.trackingId).toBe('aff-instap')
  })

  it('routes steep terrain to hill advice regardless of size', () => {
    const next = completeFlow(snapshot, {
      grootte: 'klein',
      helling: 'steil',
      obstakels: 'open',
      wensen: 'budget',
      stroom: 'dichtbij',
      kabel: 'geen_probleem',
      lead: '',
    })

    expect(next.resultKey).toBe('advies_helling')
    expect(next.result.title).toBe('Voor steile hellingen')
  })

  it('routes large complex gardens to premium advice', () => {
    const next = completeFlow(snapshot, {
      grootte: 'groot',
      helling: 'vlak',
      obstakels: 'complex',
      wensen: 'kracht',
      stroom: 'dichtbij',
      kabel: 'geen_probleem',
      lead: '',
    })

    expect(next.resultKey).toBe('advies_premium')
    expect(next.result.body.voorbeeldmodellen).toContain('Husqvarna Automower 435X AWD')
  })
})
