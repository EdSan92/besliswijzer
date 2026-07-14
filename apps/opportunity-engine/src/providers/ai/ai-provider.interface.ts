import { z, type ZodType } from 'zod'

export type AiGenerateOptions = {
  promptName?: string
  temperature?: number
  maxOutputTokens?: number
}

export type AiCallMetrics = {
  model: string
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
  retryCount: number
}

export interface AIProvider {
  readonly name: string
  generateText(prompt: string, options?: AiGenerateOptions): Promise<{ text: string; metrics: AiCallMetrics }>
  generateJSON<T>(prompt: string, options?: AiGenerateOptions): Promise<{ data: T; metrics: AiCallMetrics }>
  generateObject<T>(
    schema: ZodType<T>,
    prompt: string,
    options?: AiGenerateOptions,
  ): Promise<{ data: T; metrics: AiCallMetrics }>
}

export function extractJsonFromText(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() ?? text.trim()
  return JSON.parse(candidate)
}
