import {
  validateFlowBrief,
  validateFlowGraph,
  type CompiledFlowArtefact,
  type FlowBrief,
} from '@besliswijzer/flow-compiler'
import { flowDefinitionSchema, validateFlowDefinition } from '@besliswijzer/flow-schema'
import type { PipelineQualityConfig } from '../config.js'
import type { QualityFinding } from '../types.js'

function errorFinding(
  ruleCode: string,
  artifactKind: string,
  field: string,
  message: string,
): QualityFinding {
  return { ruleCode, severity: 'error', artifactKind, field, message }
}

function warningFinding(
  ruleCode: string,
  artifactKind: string,
  field: string,
  message: string,
): QualityFinding {
  return { ruleCode, severity: 'warning', artifactKind, field, message }
}

export function runFlowBriefRules(brief: FlowBrief): QualityFinding[] {
  const findings: QualityFinding[] = []

  for (const message of validateFlowBrief(brief)) {
    findings.push(errorFinding('FLOW_BRIEF_INVALID', 'flow_brief', 'brief', message))
  }

  return findings
}

export function runCompiledFlowRules(
  artefact: CompiledFlowArtefact,
  config: PipelineQualityConfig,
): QualityFinding[] {
  const findings: QualityFinding[] = []
  const parsed = flowDefinitionSchema.safeParse(artefact.flow)

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      findings.push(
        errorFinding(
          'FLOW_SCHEMA_INVALID',
          'compiled_flow',
          issue.path.join('.') || 'flow',
          issue.message,
        ),
      )
    }
    return findings
  }

  for (const message of validateFlowDefinition(parsed.data)) {
    findings.push(errorFinding('FLOW_STRUCTURE_INVALID', 'compiled_flow', 'flow', message))
  }

  for (const message of validateFlowGraph(parsed.data)) {
    findings.push(errorFinding('FLOW_GRAPH_INVALID', 'compiled_flow', 'flow', message))
  }

  if (parsed.data.nodes.length > config.maxNodeCount) {
    findings.push(
      warningFinding(
        'FLOW_NODE_COUNT_HIGH',
        'compiled_flow',
        'nodes',
        `Flow has ${parsed.data.nodes.length} nodes (max ${config.maxNodeCount})`,
      ),
    )
  }

  if (parsed.data.results.length === 0) {
    findings.push(
      errorFinding('FLOW_MISSING_RESULTS', 'compiled_flow', 'results', 'Flow must define at least one result'),
    )
  }

  for (const node of parsed.data.nodes) {
    if (node.title.length > config.maxNodeTitleLength) {
      findings.push(
        warningFinding(
          'FLOW_NODE_TITLE_TOO_LONG',
          'compiled_flow',
          `nodes.${node.nodeKey}.title`,
          `Title exceeds ${config.maxNodeTitleLength} characters`,
        ),
      )
    }

    const labels = node.options.map((option) => option.label.toLowerCase().trim())
    for (let left = 0; left < labels.length; left += 1) {
      for (let right = left + 1; right < labels.length; right += 1) {
        const overlap = labelOverlapRatio(labels[left]!, labels[right]!)
        if (overlap >= config.optionLabelOverlapThreshold) {
          findings.push(
            warningFinding(
              'FLOW_OPTION_LABEL_OVERLAP',
              'compiled_flow',
              `nodes.${node.nodeKey}.options`,
              `Options "${node.options[left]!.label}" and "${node.options[right]!.label}" overlap (${overlap.toFixed(2)})`,
            ),
          )
        }
      }
    }
  }

  return findings
}

function labelOverlapRatio(left: string, right: string): number {
  if (left === right) {
    return 1
  }

  const leftTokens = tokenize(left)
  const rightTokens = tokenize(right)
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0
  }

  let intersection = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1
    }
  }

  const union = new Set([...leftTokens, ...rightTokens]).size
  return union === 0 ? 0 : intersection / union
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length > 2),
  )
}
