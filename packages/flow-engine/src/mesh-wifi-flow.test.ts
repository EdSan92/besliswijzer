import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { FlowDefinition, FlowSnapshot } from '@besliswijzer/flow-schema'
import { resolveNext } from './index.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const flowPath = resolve(repoRoot, 'flows/examples/mesh-wifi-keuzehulp.json')

function loadSnapshot(): FlowSnapshot {
  const raw = JSON.parse(readFileSync(flowPath, 'utf8')) as { flow: FlowDefinition }
  const flow = raw.flow

  return {
    flowId: '00000000-0000-0000-0000-000000000007',
    versionId: '00000000-0000-0000-0000-000000000008',
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

const baseAnswers = {
  woningtype: 'appartement',
  oppervlak: 'klein',
  verdiepingen: '1',
  snelheid: 'tot_100',
  backhaul: 'nee',
  muren: 'hout_gips',
  apparaten: 'weinig',
  gebruik: 'basis',
  wifi_standaard: 'wifi5_ok',
  ouderlijk_toezicht: 'nee',
  budget: '150_300',
  lead: '',
}

describe('mesh-wifi reference flow', () => {
  const snapshot = loadSnapshot()

  it('loads the mesh wifi flow definition with core questions', () => {
    expect(snapshot.slug).toBe('mesh-wifi')
    expect(snapshot.nodes.filter((node) => node.type === 'question')).toHaveLength(11)
    expect(snapshot.results).toHaveLength(5)
  })

  it('routes a small apartment to instap advice', () => {
    const next = completeFlow(snapshot, {
      ...baseAnswers,
      budget: 'tot_150',
    })

    expect(next.resultKey).toBe('advies_instap')
    expect(next.result.title).toBe('Instap mesh wifi-set')
  })

  it('routes wired backhaul need to backhaul advice', () => {
    const next = completeFlow(snapshot, {
      ...baseAnswers,
      woningtype: 'vrijstaand',
      oppervlak: 'groot',
      verdiepingen: '3plus',
      backhaul: 'verplicht',
      muren: 'beton_staal',
      apparaten: 'veel',
      snelheid: '500_plus',
      gebruik: 'gaming_thuiswerk',
      wifi_standaard: 'wifi6',
      budget: '300_plus',
    })

    expect(next.resultKey).toBe('advies_backhaul')
    expect(next.result.body.voorbeeldmodellen).toContain('ASUS ZenWiFi ET8')
  })

  it('routes gaming use to gaming advice', () => {
    const next = completeFlow(snapshot, {
      ...baseAnswers,
      oppervlak: 'middel',
      verdiepingen: '2',
      snelheid: '100_500',
      backhaul: 'ja',
      apparaten: 'gemiddeld',
      gebruik: 'gaming_thuiswerk',
      wifi_standaard: 'wifi6',
      budget: '150_300',
    })

    expect(next.resultKey).toBe('advies_gaming')
    expect(next.result.title).toBe('Mesh wifi voor gaming en thuiswerken')
  })

  it('routes large homes to wide coverage advice', () => {
    const next = completeFlow(snapshot, {
      ...baseAnswers,
      woningtype: 'rijtjeshuis',
      oppervlak: 'groot',
      verdiepingen: '3plus',
      snelheid: '100_500',
      backhaul: 'nee',
      muren: 'mix',
      apparaten: 'veel',
      gebruik: 'basis',
      wifi_standaard: 'wifi6',
      budget: '150_300',
    })

    expect(next.resultKey).toBe('advies_groot_bereik')
    expect(next.result.ctas[0]?.trackingId).toBe('aff-mesh-wifi-dekking')
  })

  it('routes future-proof preference to premium advice', () => {
    const next = completeFlow(snapshot, {
      ...baseAnswers,
      oppervlak: 'middel',
      verdiepingen: '2',
      snelheid: '500_plus',
      backhaul: 'ja',
      muren: 'mix',
      apparaten: 'gemiddeld',
      gebruik: 'beide',
      wifi_standaard: 'wifi6e_7',
      ouderlijk_toezicht: 'ja',
      budget: '300_plus',
    })

    expect(next.resultKey).toBe('advies_premium')
    expect(next.result.title).toBe('Toekomstbestendige premium mesh set')
  })
})
