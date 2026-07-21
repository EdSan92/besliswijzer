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

  try {
    return JSON.parse(candidate)
  } catch {
    const objectStart = candidate.indexOf('{')
    const arrayStart = candidate.indexOf('[')
    const start =
      objectStart === -1
        ? arrayStart
        : arrayStart === -1
          ? objectStart
          : Math.min(objectStart, arrayStart)

    if (start === -1) {
      throw new Error('No JSON object found in AI response')
    }

    const slice = candidate.slice(start)
    for (let end = slice.length; end > 0; end--) {
      const fragment = slice.slice(0, end).trimEnd()
      if (!fragment) continue
      try {
        return JSON.parse(fragment)
      } catch {
        // Try a shorter prefix when Gemini appends trailing text.
      }
    }

    throw new Error('Failed to parse JSON from AI response')
  }
}
