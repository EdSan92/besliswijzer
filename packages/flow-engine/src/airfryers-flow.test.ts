import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { FlowDefinition, FlowSnapshot } from '@besliswijzer/flow-schema'
import { resolveNext } from './index.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const airfryerFlowPath = resolve(repoRoot, 'flows/examples/airfryer-keuzehulp.json')

function loadAirfryerSnapshot(): FlowSnapshot {
  const raw = JSON.parse(readFileSync(airfryerFlowPath, 'utf8')) as { flow: FlowDefinition }
  const flow = raw.flow

  return {
    flowId: '00000000-0000-0000-0000-000000000003',
    versionId: '00000000-0000-0000-0000-000000000004',
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

describe('airfryers reference flow', () => {
  const snapshot = loadAirfryerSnapshot()

  it('loads the airfryer flow definition with core questions', () => {
    expect(snapshot.slug).toBe('airfryers')
    expect(snapshot.nodes.filter((node) => node.type === 'question')).toHaveLength(7)
    expect(snapshot.results.length).toBeGreaterThanOrEqual(3)
  })

  it('routes a compact budget household to instap advice', () => {
    const next = completeFlow(snapshot, {
      huishouden: '1_2',
      gebruik: 'af_en_toe',
      capaciteit: 'compact',
      manden: 'nee',
      ruimte: 'weinig',
      budget: 'tot_75',
      functies: 'bakken',
      lead: '',
    })

    expect(next.resultKey).toBe('advies_instap')
    expect(next.result.title).toBe('Compacte instap-airfryer')
    expect(next.result.ctas[0]?.trackingId).toBe('aff-airfryer-instap')
  })

  it('routes dual-basket need to family advice', () => {
    const next = completeFlow(snapshot, {
      huishouden: '3_4',
      gebruik: 'regelmatig',
      capaciteit: 'middel',
      manden: 'ja_twee',
      ruimte: 'gemiddeld',
      budget: '75_150',
      functies: 'bakken',
      lead: '',
    })

    expect(next.resultKey).toBe('advies_familie')
    expect(next.result.body.voorbeeldmodellen).toContain('Philips Airfryer Dual Basket')
  })

  it('routes oven-style preference to oven advice', () => {
    const next = completeFlow(snapshot, {
      huishouden: '3_4',
      gebruik: 'dagelijks',
      capaciteit: 'groot',
      manden: 'maakt_niet_uit',
      ruimte: 'veel',
      budget: '150_250',
      functies: 'oven',
      lead: '',
    })

    expect(next.resultKey).toBe('advies_oven')
    expect(next.result.title).toBe('Airfryer-oven voor veelzijdig koken')
  })

  it('routes premium budget to premium advice', () => {
    const next = completeFlow(snapshot, {
      huishouden: '5plus',
      gebruik: 'dagelijks',
      capaciteit: 'groot',
      manden: 'ja_twee',
      ruimte: 'veel',
      budget: 'meer_250',
      functies: 'alles',
      lead: '',
    })

    expect(next.resultKey).toBe('advies_premium')
    expect(next.result.body.voorbeeldmodellen).toContain('Ninja Foodi MAX')
  })
})
