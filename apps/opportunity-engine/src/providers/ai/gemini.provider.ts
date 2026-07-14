import { z, type ZodType } from 'zod'
import { getConfig, getGeminiModels } from '../../config/index.js'
import type { AiCallRepository } from '../../repositories/ai-call.repository.js'
import type { PromptLogRepository } from '../../repositories/prompt-log.repository.js'
import { hashPrompt } from '../../utils/hash.js'
import { logger } from '../../utils/logger.js'
import { isRetryableError, withRetry } from '../../utils/retry.js'
import {
  type AIProvider,
  type AiCallMetrics,
  type AiGenerateOptions,
  extractJsonFromText,
} from './ai-provider.interface.js'

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  error?: { message?: string }
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini'

  constructor(
    private readonly promptLogRepo: PromptLogRepository,
    private readonly aiCallRepo: AiCallRepository,
  ) {}

  async generateText(
    prompt: string,
    options?: AiGenerateOptions,
  ): Promise<{ text: string; metrics: AiCallMetrics }> {
    const { text, metrics, promptLogId } = await this.callGemini(prompt, options)
    await this.aiCallRepo.create({
      provider: this.name,
      model: metrics.model,
      operation: 'generateText',
      promptLogId,
      inputTokens: metrics.inputTokens,
      outputTokens: metrics.outputTokens,
      latencyMs: metrics.latencyMs,
      retryCount: metrics.retryCount,
      success: true,
    })
    return { text, metrics }
  }

  async generateJSON<T>(
    prompt: string,
    options?: AiGenerateOptions,
  ): Promise<{ data: T; metrics: AiCallMetrics }> {
    const { text, metrics, promptLogId } = await this.callGemini(prompt, options)
    try {
      const data = extractJsonFromText(text) as T
      await this.aiCallRepo.create({
        provider: this.name,
        model: metrics.model,
        operation: 'generateJSON',
        promptLogId,
        inputTokens: metrics.inputTokens,
        outputTokens: metrics.outputTokens,
        latencyMs: metrics.latencyMs,
        retryCount: metrics.retryCount,
        success: true,
      })
      return { data, metrics }
    } catch (error) {
      await this.aiCallRepo.create({
        provider: this.name,
        model: metrics.model,
        operation: 'generateJSON',
        promptLogId,
        latencyMs: metrics.latencyMs,
        retryCount: metrics.retryCount,
        success: false,
        error: error instanceof Error ? error.message : 'JSON parse failed',
      })
      throw error
    }
  }

  async generateObject<T>(
    schema: ZodType<T>,
    prompt: string,
    options?: AiGenerateOptions,
  ): Promise<{ data: T; metrics: AiCallMetrics }> {
    const { data, metrics } = await this.generateJSON<unknown>(prompt, options)
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Gemini response failed schema validation: ${parsed.error.message}`)
    }
    return { data: parsed.data, metrics }
  }

  private async callGemini(
    prompt: string,
    options?: AiGenerateOptions,
  ): Promise<{ text: string; metrics: AiCallMetrics; promptLogId: string }> {
    const config = getConfig()
    const models = getGeminiModels()
    const promptName = options?.promptName ?? 'unknown'
    const promptLog = await this.promptLogRepo.create({
      promptName,
      promptHash: hashPrompt(prompt),
      input: { promptLength: prompt.length },
    })

    let retryCount = 0
    let lastError = 'No model available'

    for (const model of models) {
      try {
        const result = await withRetry(
          async () => {
            const start = Date.now()
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: {
                    temperature: options?.temperature ?? 0.3,
                    maxOutputTokens: options?.maxOutputTokens ?? 4096,
                    responseMimeType: 'application/json',
                  },
                }),
              },
            )

            const body = (await response.json()) as GeminiResponse
            if (!response.ok) {
              const message = body.error?.message ?? `HTTP ${response.status}`
              throw new Error(message)
            }

            const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
            if (!text) throw new Error('Empty Gemini response')

            return {
              text,
              latencyMs: Date.now() - start,
              inputTokens: body.usageMetadata?.promptTokenCount,
              outputTokens: body.usageMetadata?.candidatesTokenCount,
            }
          },
          {
            maxRetries: 2,
            onRetry: (attempt) => {
              retryCount = attempt
            },
          },
        )

        await this.promptLogRepo.updateSuccess(promptLog.id, { text: result.text }, model, result.latencyMs)

        return {
          text: result.text,
          metrics: {
            model,
            latencyMs: result.latencyMs,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            retryCount,
          },
          promptLogId: promptLog.id,
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        logger.warn({ model, error: lastError }, 'Gemini model failed, trying next')
        if (!isRetryableError(error) && model === models[models.length - 1]) break
      }
    }

    await this.promptLogRepo.updateError(promptLog.id, lastError)
    throw new Error(`Gemini API failed: ${lastError}`)
  }
}
