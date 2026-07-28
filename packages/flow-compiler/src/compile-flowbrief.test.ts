import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { flowDefinitionSchema, validateFlowDefinition } from '@besliswijzer/flow-schema'
import {
  compileFlowBrief,
  FLOW_COMPILER_VERSION,
  flowBriefSchema,
  validateFlowBrief,
  validateFlowGraph,
} from './index.js'

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function loadFixture(name: string) {
  const raw = JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf8'))
  return flowBriefSchema.parse(raw)
}

const airfryerBrief = loadFixture('airfryer-flowbrief.json')
const robotstofzuigerBrief = loadFixture('robotstofzuiger-flowbrief.json')

describe('validateFlowBrief', () => {
  it('rejects duplicate question keys', () => {
    const errors = validateFlowBrief({
      ...airfryerBrief,
      questions: [
        airfryerBrief.questions[0]!,
        { ...airfryerBrief.questions[0]!, title: 'Duplicate' },
      ],
    })

    expect(errors).toContain('Question keys must be unique')
  })

  it('rejects decision rules without targets', () => {
    const errors = validateFlowBrief({
      ...airfryerBrief,
      decisionRules: [{ fromQuestionKey: 'huishouden', condition: {} }],
    })

    expect(errors.some((error) => error.includes('needs a target'))).toBe(true)
  })
})

describe('compileFlowBrief', () => {
  it('compiles the airfryer fixture into a valid flow definition', () => {
    const result = compileFlowBrief(airfryerBrief)
    expect(result.ok, result.ok ? undefined : JSON.stringify(result.errors)).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.artefact.kind).toBe('compiled_flow')
    expect(result.artefact.compilerVersion).toBe(FLOW_COMPILER_VERSION)
    expect(flowDefinitionSchema.parse(result.flow).slug).toBe('airfryers')
    expect(validateFlowDefinition(result.flow)).toEqual([])
    expect(validateFlowGraph(result.flow)).toEqual([])
    expect(result.flow.nodes.some((node) => node.nodeKey === 'lead' && node.type === 'lead_capture')).toBe(
      true,
    )
  })

  it('compiles the robotstofzuiger fixture into a valid flow definition', () => {
    const result = compileFlowBrief(robotstofzuigerBrief)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.flow.slug).toBe('robotstofzuigers')
    expect(validateFlowDefinition(result.flow)).toEqual([])
    expect(validateFlowGraph(result.flow)).toEqual([])
  })

  it('is deterministic for the same approved brief', () => {
    const first = compileFlowBrief(airfryerBrief)
    const second = compileFlowBrief(airfryerBrief)

    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) {
      return
    }

    expect(JSON.stringify(first.flow)).toBe(JSON.stringify(second.flow))
    expect(JSON.stringify(first.artefact)).toBe(JSON.stringify(second.artefact))
  })

  it('returns concrete errors for invalid brief input', () => {
    const result = compileFlowBrief({
      ...airfryerBrief,
      decisionRules: [
        {
          fromQuestionKey: 'unknown',
          condition: {},
          targetResultKey: 'advies_instap',
        },
      ],
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }

    expect(result.errors.some((error) => error.includes('unknown fromQuestionKey'))).toBe(true)
  })

  it('blocks flows with cycles in explicit branch rules', () => {
    const result = compileFlowBrief({
      ...airfryerBrief,
      includeLeadCapture: false,
      decisionRules: [
        {
          fromQuestionKey: 'huishouden',
          condition: {},
          targetQuestionKey: 'budget',
        },
        {
          fromQuestionKey: 'budget',
          condition: {},
          targetQuestionKey: 'huishouden',
        },
        {
          fromQuestionKey: 'functies',
          condition: {},
          targetResultKey: 'advies_instap',
        },
      ],
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }

    expect(result.errors.some((error) => error.includes('Cycle detected'))).toBe(true)
  })
})

describe('compileFlowBrief snapshots', () => {
  it('matches airfryer compiler snapshot', () => {
    const result = compileFlowBrief(airfryerBrief)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.flow).toMatchSnapshot()
  })

  it('matches robotstofzuiger compiler snapshot', () => {
    const result = compileFlowBrief(robotstofzuigerBrief)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.flow).toMatchSnapshot()
  })
})
