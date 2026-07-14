export const GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
] as const

export function getModelsToTry(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim()
  if (!preferred) return [...GEMINI_MODELS]
  return [preferred, ...GEMINI_MODELS.filter((model) => model !== preferred)]
}

export function isRetryableGeminiError(status: number, message: string): boolean {
  const lower = message.toLowerCase()
  return (
    status === 429 ||
    status === 503 ||
    lower.includes('high demand') ||
    lower.includes('try again later') ||
    lower.includes('overloaded') ||
    lower.includes('resource_exhausted') ||
    lower.includes('unavailable')
  )
}
