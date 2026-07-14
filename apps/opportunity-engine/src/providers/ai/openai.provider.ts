import { z, type ZodType } from 'zod'
import { getConfig } from '../../config/index.js'
import type { AiCallRepository } from '../../repositories/ai-call.repository.js'
import type { PromptLogRepository } from '../../repositories/prompt-log.repository.js'
import { hashPrompt } from '../../utils/hash.js'
import {
  type AIProvider,
  type AiCallMetrics,
  type AiGenerateOptions,
  extractJsonFromText,
} from './ai-provider.interface.js'

type OpenAiResponse = {
  choices?: Array<{ message?: { content?: string } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  error?: { message?: string }
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'

  constructor(
    private readonly promptLogRepo: PromptLogRepository,
    private readonly aiCallRepo: AiCallRepository,
  ) {}

  async generateText(prompt: string, options?: AiGenerateOptions) {
    const result = await this.callOpenAI(prompt, options)
    await this.logCall('generateText', result)
    return { text: result.text, metrics: result.metrics }
  }

  async generateJSON<T>(prompt: string, options?: AiGenerateOptions) {
    const result = await this.callOpenAI(prompt, options)
    const data = extractJsonFromText(result.text) as T
    await this.logCall('generateJSON', result)
    return { data, metrics: result.metrics }
  }

  async generateObject<T>(schema: ZodType<T>, prompt: string, options?: AiGenerateOptions) {
    const { data, metrics } = await this.generateJSON<unknown>(prompt, options)
    const parsed = schema.safeParse(data)
    if (!parsed.success) throw new Error(parsed.error.message)
    return { data: parsed.data, metrics }
  }

  private async callOpenAI(prompt: string, options?: AiGenerateOptions) {
    const config = getConfig()
    if (!config.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured')

    const promptLog = await this.promptLogRepo.create({
      promptName: options?.promptName ?? 'unknown',
      promptHash: hashPrompt(prompt),
      input: { promptLength: prompt.length },
    })

    const start = Date.now()
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.OPENAI_MODEL,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxOutputTokens ?? 4096,
        messages: [
          { role: 'system', content: 'Antwoord altijd met geldig JSON wanneer gevraagd.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    const body = (await response.json()) as OpenAiResponse
    const latencyMs = Date.now() - start

    if (!response.ok) {
      const message = body.error?.message ?? `HTTP ${response.status}`
      await this.promptLogRepo.updateError(promptLog.id, message)
      throw new Error(message)
    }

    const text = body.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('Empty OpenAI response')

    await this.promptLogRepo.updateSuccess(promptLog.id, { text }, config.OPENAI_MODEL, latencyMs)

    return {
      text,
      promptLogId: promptLog.id,
      metrics: {
        model: config.OPENAI_MODEL,
        latencyMs,
        inputTokens: body.usage?.prompt_tokens,
        outputTokens: body.usage?.completion_tokens,
        retryCount: 0,
      },
    }
  }

  private async logCall(
    operation: string,
    result: { promptLogId: string; metrics: AiCallMetrics },
  ) {
    await this.aiCallRepo.create({
      provider: this.name,
      model: result.metrics.model,
      operation,
      promptLogId: result.promptLogId,
      inputTokens: result.metrics.inputTokens,
      outputTokens: result.metrics.outputTokens,
      latencyMs: result.metrics.latencyMs,
      retryCount: result.metrics.retryCount,
      success: true,
    })
  }
}
