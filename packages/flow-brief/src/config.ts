import { FLOW_BRIEF_PROMPT_VERSION } from './artifact.js'

export type FlowBriefConfig = {
  promptVersion: string
  provider: string
  model: string
}

export function readFlowBriefConfigFromEnv(env: NodeJS.ProcessEnv = process.env): FlowBriefConfig {
  return {
    promptVersion: env.FLOW_BRIEF_PROMPT_VERSION ?? FLOW_BRIEF_PROMPT_VERSION,
    provider: env.FLOW_BRIEF_MODEL_PROVIDER ?? 'gemini',
    model: env.FLOW_BRIEF_MODEL_NAME ?? 'gemini-3.1-flash-lite',
  }
}
