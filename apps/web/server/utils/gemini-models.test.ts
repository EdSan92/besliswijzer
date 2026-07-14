import { afterEach, describe, expect, it } from 'vitest'
import { GEMINI_MODELS, getModelsToTry, isRetryableGeminiError } from './gemini-models'

const originalGeminiModel = process.env.GEMINI_MODEL

afterEach(() => {
  if (originalGeminiModel === undefined) {
    delete process.env.GEMINI_MODEL
  } else {
    process.env.GEMINI_MODEL = originalGeminiModel
  }
})

describe('getModelsToTry', () => {
  it('returns defaults when no preferred model is set', () => {
    delete process.env.GEMINI_MODEL
    expect(getModelsToTry()).toEqual([...GEMINI_MODELS])
  })

  it('puts preferred model first without duplicates', () => {
    process.env.GEMINI_MODEL = 'gemini-3.5-flash'
    expect(getModelsToTry()).toEqual(['gemini-3.5-flash', 'gemini-3.1-flash-lite'])
  })
})

describe('isRetryableGeminiError', () => {
  it('detects retryable status codes and messages', () => {
    expect(isRetryableGeminiError(429, 'Too many requests')).toBe(true)
    expect(isRetryableGeminiError(503, 'Service unavailable')).toBe(true)
    expect(isRetryableGeminiError(500, 'Model overloaded, try again later')).toBe(true)
  })

  it('rejects permanent failures', () => {
    expect(isRetryableGeminiError(400, 'Invalid API key')).toBe(false)
  })
})
