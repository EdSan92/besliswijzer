import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { FlowDefinition, FlowSnapshot } from '@besliswijzer/flow-schema'
import { resolveNext } from './index.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const flowPath = resolve(repoRoot, 'flows/examples/robotstofzuiger-keuzehulp.json')

function loadSnapshot(): FlowSnapshot {
  const raw = JSON.parse(readFileSync(flowPath, 'utf8')) as { flow: FlowDefinition }
  const flow = raw.flow

  return {
    flowId: '00000000-0000-0000-0000-000000000005',
    versionId: '00000000-0000-0000-0000-000000000006',
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

describe('robotstofzuigers reference flow', () => {
  const snapshot = loadSnapshot()

  it('loads the robotstofzuiger flow definition with core questions', () => {
    expect(snapshot.slug).toBe('robotstofzuigers')
    expect(snapshot.nodes.filter((node) => node.type === 'question')).toHaveLength(10)
    expect(snapshot.results).toHaveLength(5)
  })

  it('routes a budget household to basis advice', () => {
    const next = completeFlow(snapshot, {
      vloertype: 'hard',
      huisdieren: 'nee',
      drempels: 'laag',
      oppervlak: 'klein',
      verdiepingen: 'nee',
      dweilfunctie: 'nee',
      obstakels: 'basis',
      leegstation: 'nee',
      geluid: 'normaal',
      budget: 'tot_300',
      lead: '',
    })

    expect(next.resultKey).toBe('advies_basis')
    expect(next.result.title).toBe('Budget robotstofzuiger')
  })

  it('routes pet owners to huisdieren advice', () => {
    const next = completeFlow(snapshot, {
      vloertype: 'mix',
      huisdieren: 'ja',
      drempels: 'laag',
      oppervlak: 'middel',
      verdiepingen: 'nee',
      dweilfunctie: 'nee',
      obstakels: 'basis',
      leegstation: 'nee',
      geluid: 'normaal',
      budget: '300_500',
      lead: '',
    })

    expect(next.resultKey).toBe('advies_huisdieren')
    expect(next.result.body.voorbeeldmodellen).toContain('Roborock Qrevo S')
  })

  it('routes mop preference to dweilen advice', () => {
    const next = completeFlow(snapshot, {
      vloertype: 'hard',
      huisdieren: 'nee',
      drempels: 'middel',
      oppervlak: 'groot',
      verdiepingen: 'ja',
      dweilfunctie: 'ja',
      obstakels: 'premium',
      leegstation: 'nee',
      geluid: 'stil',
      budget: '500_plus',
      lead: '',
    })

    expect(next.resultKey).toBe('advies_dweilen')
    expect(next.result.title).toBe('Robotstofzuiger met dweilfunctie')
  })

  it('routes auto-empty need to leegstation advice', () => {
    const next = completeFlow(snapshot, {
      vloertype: 'mix',
      huisdieren: 'nee',
      drempels: 'hoog',
      oppervlak: 'groot',
      verdiepingen: 'ja',
      dweilfunctie: 'nee',
      obstakels: 'premium',
      leegstation: 'ja',
      geluid: 'stil',
      budget: '500_plus',
      lead: '',
    })

    expect(next.resultKey).toBe('advies_leegstation')
    expect(next.result.ctas[0]?.trackingId).toBe('aff-robotstofzuiger-leegstation')
  })

  it('routes premium navigation preference to premium advice', () => {
    const next = completeFlow(snapshot, {
      vloertype: 'mix',
      huisdieren: 'nee',
      drempels: 'hoog',
      oppervlak: 'groot',
      verdiepingen: 'ja',
      dweilfunctie: 'nee',
      obstakels: 'premium',
      leegstation: 'nee',
      geluid: 'stil',
      budget: '500_plus',
      lead: '',
    })

    expect(next.resultKey).toBe('advies_premium')
    expect(next.result.title).toBe('Premium robotstofzuiger met slimme navigatie')
  })
})
