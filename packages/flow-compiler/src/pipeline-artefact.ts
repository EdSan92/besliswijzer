import type { FlowDefinition } from '@besliswijzer/flow-schema'

export const FLOW_COMPILER_VERSION = '1.0.0' as const

export type CompiledFlowArtefact = {
  kind: 'compiled_flow'
  compilerVersion: typeof FLOW_COMPILER_VERSION
  flow: FlowDefinition
}

export function createCompiledFlowArtefact(flow: FlowDefinition): CompiledFlowArtefact {
  return {
    kind: 'compiled_flow',
    compilerVersion: FLOW_COMPILER_VERSION,
    flow,
  }
}

export type PipelineArtefact = CompiledFlowArtefact
