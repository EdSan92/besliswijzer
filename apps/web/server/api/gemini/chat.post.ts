import { getGeminiApiKey } from '../../utils/runtime-config'
import { getModelsToTry, isRetryableGeminiError } from '../../utils/gemini-models'
import type { ApiFlowStep, GeminiChatResponse } from '~/types/gemini'

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  error?: {
    message?: string
    code?: number
    status?: string
  }
}

type GeminiCallResult = {
  model: string
  data: GeminiApiResponse
  status: number
  durationMs: number
}

function createStep(
  id: string,
  label: string,
  status: ApiFlowStep['status'],
  detail?: string,
  durationMs?: number,
): ApiFlowStep {
  return {
    id,
    label,
    status,
    detail,
    timestamp: new Date().toISOString(),
    durationMs,
  }
}

function buildGeminiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}

async function callGemini(model: string, message: string, apiKey: string): Promise<GeminiCallResult> {
  const start = Date.now()
  const response = await fetch(`${buildGeminiUrl(model)}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: message }] }],
    }),
  })

  const data = (await response.json()) as GeminiApiResponse
  return {
    model,
    data,
    status: response.status,
    durationMs: Date.now() - start,
  }
}

export default defineEventHandler(async (event): Promise<GeminiChatResponse> => {
  const config = useRuntimeConfig()
  const apiKey = getGeminiApiKey(config.geminiApiKey as string)

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GEMINI_API_KEY is niet geconfigureerd',
    })
  }

  const body = await readBody<{ message?: string }>(event)
  const message = body?.message?.trim()

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bericht is verplicht',
    })
  }

  const steps: ApiFlowStep[] = [
    createStep('receive', 'Bericht ontvangen', 'done', `POST /api/gemini/chat — ${message.length} tekens`),
  ]

  const modelsToTry = getModelsToTry()
  let lastError = 'Geen model beschikbaar'
  let result: GeminiCallResult | null = null

  for (const [index, model] of modelsToTry.entries()) {
    const stepId = `gemini-request-${index}`
    steps.push(createStep(stepId, 'Verzoek naar Google Gemini', 'active', `Model: ${model}`))

    try {
      const attempt = await callGemini(model, message, apiKey)

      if (attempt.status >= 200 && attempt.status < 300) {
        steps[steps.length - 1] = createStep(
          stepId,
          'Verzoek naar Google Gemini',
          'done',
          `Model: ${model} — HTTP ${attempt.status} — ${attempt.durationMs}ms`,
          attempt.durationMs,
        )
        result = attempt
        break
      }

      const errorMessage = attempt.data.error?.message ?? `HTTP ${attempt.status}`
      lastError = errorMessage

      if (index < modelsToTry.length - 1 && isRetryableGeminiError(attempt.status, errorMessage)) {
        steps[steps.length - 1] = createStep(
          stepId,
          'Verzoek naar Google Gemini',
          'done',
          `${model}: ${errorMessage} — volgend model proberen`,
          attempt.durationMs,
        )
        continue
      }

      steps[steps.length - 1] = createStep(
        stepId,
        'Verzoek naar Google Gemini',
        'error',
        `${model}: ${errorMessage}`,
        attempt.durationMs,
      )
      throw createError({ statusCode: 502, statusMessage: `Gemini API fout: ${errorMessage}` })
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error
      }

      const detail = error instanceof Error ? error.message : 'Netwerkfout'
      lastError = detail
      steps[steps.length - 1] = createStep(stepId, 'Verzoek naar Google Gemini', 'error', `${model}: ${detail}`)

      if (index < modelsToTry.length - 1) continue
      throw createError({ statusCode: 502, statusMessage: `Gemini API niet bereikbaar: ${detail}` })
    }
  }

  if (!result) {
    throw createError({ statusCode: 502, statusMessage: `Gemini API fout: ${lastError}` })
  }

  const reply =
    result.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'Geen antwoord ontvangen van Gemini.'

  steps.push(
    createStep('parse', 'Antwoord verwerken', 'done', `${reply.length} tekens ontvangen`),
    createStep('respond', 'Antwoord terugsturen', 'done', 'Response naar client'),
  )

  return {
    reply,
    steps,
    model: result.model,
  }
})
