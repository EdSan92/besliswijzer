import type { PipelineQualityInput } from './artefacts.js'
import { mergePipelineQualityConfig, type PipelineQualityConfig } from './config.js'
import { buildQualityReport } from './report.js'
import { runContentPackageRules } from './rules/content-rules.js'
import { runCompiledFlowRules, runFlowBriefRules } from './rules/flow-rules.js'
import { runSimilarityRules } from './rules/similarity-rules.js'
import { runSourceClaimRules } from './rules/source-rules.js'
import type { QualityReport } from './types.js'

export function runPipelineQualityChecks(
  input: PipelineQualityInput,
  config?: Partial<PipelineQualityConfig>,
): QualityReport {
  const resolvedConfig = mergePipelineQualityConfig(config)
  const findings = []

  if (input.flowBrief) {
    findings.push(...runFlowBriefRules(input.flowBrief))
  }

  if (input.compiledFlow) {
    findings.push(...runCompiledFlowRules(input.compiledFlow, resolvedConfig))
  }

  if (input.contentPackage) {
    findings.push(...runContentPackageRules(input.contentPackage, resolvedConfig))
    if (input.existingPages?.length) {
      findings.push(...runSimilarityRules(input.contentPackage, input.existingPages, resolvedConfig))
    }
  }

  if (input.claims?.length) {
    findings.push(...runSourceClaimRules(input.claims))
  }

  return buildQualityReport(findings, resolvedConfig)
}
