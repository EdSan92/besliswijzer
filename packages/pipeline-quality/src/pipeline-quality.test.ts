import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compileFlowBrief, flowBriefSchema } from '@besliswijzer/flow-compiler'
import {
  assertPublishAllowed,
  buildQualityReport,
  canPublish,
  runCompiledFlowRules,
  runContentPackageRules,
  runFlowBriefRules,
  runPipelineQualityChecks,
  runSimilarityRules,
  runSourceClaimRules,
  type ContentPackage,
} from './index.js'

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../flow-compiler/src/fixtures')

function loadCompiledFlow() {
  const brief = flowBriefSchema.parse(
    JSON.parse(readFileSync(resolve(fixturesDir, 'airfryer-flowbrief.json'), 'utf8')),
  )
  const compiled = compileFlowBrief(brief)
  if (!compiled.ok) {
    throw new Error(compiled.errors.join('; '))
  }
  return compiled.artefact
}

const validContent: ContentPackage = {
  slug: 'airfryers',
  intro: 'Een airfryer helpt je gezonder te bakken met minder vet.',
  buyingGuide: 'Let op capaciteit, functies en onderhoudsgemak.',
  faq: [{ question: 'Wat kost een goede airfryer?', answer: 'Reken op €75 tot €250 afhankelijk van functies.' }],
  metadata: {
    title: 'Airfryer kiezen: complete koopgids',
    description: 'Ontdek welke airfryer past bij jouw huishouden, budget en kookgewoonten.',
  },
}

describe('runFlowBriefRules', () => {
  it('flags invalid brief references as errors', () => {
    const brief = flowBriefSchema.parse(
      JSON.parse(readFileSync(resolve(fixturesDir, 'airfryer-flowbrief.json'), 'utf8')),
    )

    const findings = runFlowBriefRules({
      ...brief,
      decisionRules: [{ fromQuestionKey: 'missing', condition: {}, targetResultKey: 'advies_instap' }],
    })

    expect(findings.some((finding) => finding.ruleCode === 'FLOW_BRIEF_INVALID')).toBe(true)
    expect(findings.every((finding) => finding.severity === 'error')).toBe(true)
  })
})

describe('runCompiledFlowRules', () => {
  it('accepts a valid compiled flow artefact', () => {
    const findings = runCompiledFlowRules(loadCompiledFlow(), {
      maxNodeCount: 20,
      maxNodeTitleLength: 120,
      optionLabelOverlapThreshold: 0.85,
      minMetadataTitleLength: 10,
      minMetadataDescriptionLength: 50,
      forbiddenPlaceholders: [],
      pageSimilarityThreshold: 0.75,
      warningScorePenalty: 5,
      infoScorePenalty: 1,
    })

    expect(findings.filter((finding) => finding.severity === 'error')).toEqual([])
  })

  it('flags missing results as blocking errors', () => {
    const artefact = loadCompiledFlow()
    const findings = runCompiledFlowRules(
      { ...artefact, flow: { ...artefact.flow, results: [] } },
      {
        maxNodeCount: 20,
        maxNodeTitleLength: 120,
        optionLabelOverlapThreshold: 0.85,
        minMetadataTitleLength: 10,
        minMetadataDescriptionLength: 50,
        forbiddenPlaceholders: [],
        pageSimilarityThreshold: 0.75,
        warningScorePenalty: 5,
        infoScorePenalty: 1,
      },
    )

    expect(findings.some((finding) => finding.ruleCode === 'FLOW_MISSING_RESULTS')).toBe(true)
  })
})

describe('runContentPackageRules', () => {
  it('requires mandatory sections', () => {
    const findings = runContentPackageRules(
      { ...validContent, intro: '   ', faq: [] },
      {
        maxNodeCount: 20,
        maxNodeTitleLength: 120,
        optionLabelOverlapThreshold: 0.85,
        minMetadataTitleLength: 10,
        minMetadataDescriptionLength: 50,
        forbiddenPlaceholders: ['[todo]'],
        pageSimilarityThreshold: 0.75,
        warningScorePenalty: 5,
        infoScorePenalty: 1,
      },
    )

    expect(findings.some((finding) => finding.ruleCode === 'CONTENT_SECTION_MISSING')).toBe(true)
    expect(findings.some((finding) => finding.field === 'intro')).toBe(true)
    expect(findings.some((finding) => finding.field === 'faq')).toBe(true)
  })

  it('detects forbidden placeholders and duplicate FAQ questions', () => {
    const findings = runContentPackageRules(
      {
        ...validContent,
        intro: 'Nog te schrijven [TODO]',
        faq: [
          { question: 'Hoe werkt het?', answer: 'Zo werkt het.' },
          { question: 'Hoe werkt het?', answer: 'Nogmaals.' },
        ],
      },
      {
        maxNodeCount: 20,
        maxNodeTitleLength: 120,
        optionLabelOverlapThreshold: 0.85,
        minMetadataTitleLength: 10,
        minMetadataDescriptionLength: 50,
        forbiddenPlaceholders: ['[todo]'],
        pageSimilarityThreshold: 0.75,
        warningScorePenalty: 5,
        infoScorePenalty: 1,
      },
    )

    expect(findings.some((finding) => finding.ruleCode === 'CONTENT_FORBIDDEN_PLACEHOLDER')).toBe(true)
    expect(findings.some((finding) => finding.ruleCode === 'CONTENT_DUPLICATE_FAQ')).toBe(true)
  })
})

describe('runSourceClaimRules', () => {
  it('flags missing references and unproven numeric claims', () => {
    const findings = runSourceClaimRules([
      { id: 'c1', text: 'Tot 40% minder vet', requiresSource: true },
      { id: 'c2', text: 'Gemiddeld 2 kg gewicht', requiresSource: false },
    ])

    expect(findings.some((finding) => finding.ruleCode === 'SOURCE_MISSING_REFERENCE')).toBe(true)
    expect(findings.some((finding) => finding.ruleCode === 'SOURCE_UNPROVEN_NUMERIC')).toBe(true)
  })
})

describe('runSimilarityRules', () => {
  it('warns when content overlaps strongly with an existing page', () => {
    const findings = runSimilarityRules(
      validContent,
      [
        {
          slug: 'bestaande-airfryer-gids',
          title: validContent.metadata.title,
          text: `${validContent.intro}\n${validContent.buyingGuide}`,
        },
      ],
      {
        maxNodeCount: 20,
        maxNodeTitleLength: 120,
        optionLabelOverlapThreshold: 0.85,
        minMetadataTitleLength: 10,
        minMetadataDescriptionLength: 50,
        forbiddenPlaceholders: [],
        pageSimilarityThreshold: 0.5,
        warningScorePenalty: 5,
        infoScorePenalty: 1,
      },
    )

    expect(findings.some((finding) => finding.ruleCode === 'SIMILARITY_PAGE_OVERLAP')).toBe(true)
  })
})

describe('runPipelineQualityChecks', () => {
  it('produces a deterministic report for the same input', () => {
    const input = {
      compiledFlow: loadCompiledFlow(),
      contentPackage: validContent,
      claims: [{ id: 'c1', text: 'Veel modellen', requiresSource: false }],
    }

    const first = runPipelineQualityChecks(input)
    const second = runPipelineQualityChecks(input)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('blocks publication when blocking errors exist regardless of score', () => {
    const report = runPipelineQualityChecks({
      contentPackage: { ...validContent, intro: '', buyingGuide: '', faq: [] },
    })

    expect(report.hasBlockingErrors).toBe(true)
    expect(canPublish(report)).toBe(false)
    expect(() => assertPublishAllowed(report)).toThrow(/Publication blocked/)
  })

  it('allows publication when only warnings remain', () => {
    const report = runPipelineQualityChecks({
      contentPackage: validContent,
      claims: [{ id: 'c1', text: 'Bespaart 30% energie', requiresSource: false }],
    })

    expect(report.hasBlockingErrors).toBe(false)
    expect(canPublish(report)).toBe(true)
  })
})

describe('buildQualityReport', () => {
  it('sorts findings stably and applies score penalties', () => {
    const report = buildQualityReport(
      [
        {
          ruleCode: 'Z_RULE',
          severity: 'warning',
          artifactKind: 'content_package',
          field: 'intro',
          message: 'b',
        },
        {
          ruleCode: 'A_RULE',
          severity: 'info',
          artifactKind: 'content_package',
          field: 'intro',
          message: 'a',
        },
      ],
      { warningScorePenalty: 5, infoScorePenalty: 2 },
    )

    expect(report.findings[0]?.ruleCode).toBe('A_RULE')
    expect(report.score).toBe(93)
    expect(report.hasBlockingErrors).toBe(false)
  })
})
