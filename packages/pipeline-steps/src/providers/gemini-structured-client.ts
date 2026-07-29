function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('429') ||
    message.includes('503') ||
    message.includes('rate limit') ||
    message.includes('timeout') ||
    message.includes('econnreset')
  )
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; baseDelayMs: number },
): Promise<{ result: T; retryCount: number }> {
  let retryCount = 0

  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    try {
      const result = await fn()
      return { result, retryCount }
    } catch (error) {
      if (attempt >= options.maxRetries || !isRetryableError(error)) {
        throw error
      }
      retryCount += 1
      await sleep(options.baseDelayMs * 2 ** attempt)
    }
  }

  throw new Error('Retry loop exhausted')
}

export type GeminiCallMetrics = {
  provider: 'gemini'
  model: string
  operation: 'generate' | 'repair'
  inputTokens?: number
  outputTokens?: number
  latencyMs: number
  retryCount: number
  promptLength: number
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  error?: { message?: string }
}

export type GeminiStructuredClientOptions = {
  apiKey: string
  model: string
  timeoutMs?: number
  maxRetries?: number
  maxOutputTokens?: number
  baseDelayMs?: number
  fetchImpl?: typeof fetch
  onMetrics?: (metrics: GeminiCallMetrics) => void
}

function extractJsonFromText(text: string): unknown {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed)
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim())
  }

  throw new Error('Gemini response did not contain JSON')
}

export class GeminiStructuredClient {
  private readonly fetchImpl: typeof fetch

  constructor(private readonly options: GeminiStructuredClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async generateJson(
    prompt: string,
    operation: GeminiCallMetrics['operation'] = 'generate',
  ): Promise<{ raw: unknown; metrics: GeminiCallMetrics }> {
    const started = Date.now()
    const { result, retryCount } = await withRetry(
      async () => {
        const controller = new AbortController()
        const timeout = setTimeout(
          () => controller.abort(),
          this.options.timeoutMs ?? 30_000,
        )

        try {
          const response = await this.fetchImpl(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.options.model}:generateContent?key=${this.options.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: this.options.maxOutputTokens ?? 4096,
                  responseMimeType: 'application/json',
                },
              }),
            },
          )

          const payload = (await response.json()) as GeminiResponse
          if (!response.ok) {
            throw new Error(payload.error?.message ?? `Gemini HTTP ${response.status}`)
          }

          const text = payload.candidates?.[0]?.content?.parts?.[0]?.text
          if (!text) {
            throw new Error('Gemini returned empty content')
          }

          return {
            raw: extractJsonFromText(text),
            usage: payload.usageMetadata,
          }
        } finally {
          clearTimeout(timeout)
        }
      },
      {
        maxRetries: this.options.maxRetries ?? 2,
        baseDelayMs: this.options.baseDelayMs ?? 250,
      },
    )

    const metrics: GeminiCallMetrics = {
      provider: 'gemini',
      model: this.options.model,
      operation,
      inputTokens: result.usage?.promptTokenCount,
      outputTokens: result.usage?.candidatesTokenCount,
      latencyMs: Date.now() - started,
      retryCount,
      promptLength: prompt.length,
    }

    this.options.onMetrics?.(metrics)
    return { raw: result.raw, metrics }
  }
}
