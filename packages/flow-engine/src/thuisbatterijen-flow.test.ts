import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { FlowDefinition, FlowSnapshot } from '@besliswijzer/flow-schema'
import { resolveNext } from './index.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const flowPath = resolve(repoRoot, 'flows/examples/thuisbatterij-keuzehulp.json')

function loadSnapshot(): FlowSnapshot {
  const raw = JSON.parse(readFileSync(flowPath, 'utf8')) as { flow: FlowDefinition }
  const flow = raw.flow

  return {
    flowId: '00000000-0000-0000-0000-000000000009',
    versionId: '00000000-0000-0000-0000-00000000000a',
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
  zonnepanelen: 'nee',
  verbruik: 'middel',
  autonomie: 'dag_zelfvoorzienend',
  dynamisch_contract: 'nee',
  installatie: 'binnen',
  omvormer: 'onbekend',
  systeemtype: 'geen_voorkeur',
  budget: '5000_10000',
}

describe('thuisbatterijen reference flow', () => {
  const snapshot = loadSnapshot()

  it('loads the thuisbatterij flow definition without lead capture', () => {
    expect(snapshot.slug).toBe('thuisbatterijen')
    expect(snapshot.nodes.filter((node) => node.type === 'question')).toHaveLength(8)
    expect(snapshot.nodes.some((node) => node.type === 'lead_capture')).toBe(false)
    expect(snapshot.results).toHaveLength(5)
  })

  it('routes a compact budget household to instap advice', () => {
    const next = completeFlow(snapshot, {
      ...baseAnswers,
      zonnepanelen: 'nee',
      verbruik: 'laag',
      autonomie: 'dag_zelfvoorzienend',
      budget: 'tot_5000',
    })

    expect(next.resultKey).toBe('advies_compact')
    expect(next.result.title).toBe('Compacte thuisbatterij')
  })

  it('routes solar owners to zonnepanelen advice', () => {
    const next = completeFlow(snapshot, {
      ...baseAnswers,
      zonnepanelen: 'ja',
      verbruik: 'hoog',
      autonomie: 'dag_zelfvoorzienend',
      dynamisch_contract: 'ja',
      installatie: 'buiten',
      omvormer: 'bekend_merk',
      systeemtype: 'all_in_one',
      budget: '5000_10000',
    })

    expect(next.resultKey).toBe('advies_zonnepanelen')
    expect(next.result.body.voorbeeldmodellen).toContain('Sungrow SBR')
  })

  it('routes backup need to noodstroom advice', () => {
    const next = completeFlow(snapshot, {
      ...baseAnswers,
      zonnepanelen: 'nee',
      verbruik: 'hoog',
      autonomie: 'uren_backup',
      dynamisch_contract: 'nee',
      installatie: 'binnen',
      omvormer: 'geen',
      systeemtype: 'all_in_one',
      budget: '5000_10000',
    })

    expect(next.resultKey).toBe('advies_backup')
    expect(next.result.title).toBe('Thuisbatterij voor noodstroom')
  })

  it('routes modular preference to modulair advice', () => {
    const next = completeFlow(snapshot, {
      ...baseAnswers,
      zonnepanelen: 'ja',
      verbruik: 'middel',
      autonomie: 'dag_zelfvoorzienend',
      dynamisch_contract: 'ja',
      installatie: 'beide_mogelijk',
      omvormer: 'bekend_merk',
      systeemtype: 'modulair',
      budget: '5000_10000',
    })

    expect(next.resultKey).toBe('advies_modulair')
    expect(next.result.ctas[0]?.trackingId).toBe('aff-thuisbatterij-modulair')
  })

  it('routes premium budget to premium advice', () => {
    const next = completeFlow(snapshot, {
      ...baseAnswers,
      zonnepanelen: 'ja',
      verbruik: 'hoog',
      autonomie: 'max_besparing',
      dynamisch_contract: 'ja',
      installatie: 'beide_mogelijk',
      omvormer: 'bekend_merk',
      systeemtype: 'all_in_one',
      budget: '10000_plus',
    })

    expect(next.resultKey).toBe('advies_premium')
    expect(next.result.title).toBe('Premium geïntegreerd thuisaccu-systeem')
  })
})
