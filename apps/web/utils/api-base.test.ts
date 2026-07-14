import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_PRODUCTION_API_BASE, resolveApiBase, resolveOpportunityApiBase } from './api-base'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('resolveApiBase', () => {
  it('prefers explicit API_BASE_URL over localhost', () => {
    process.env.API_BASE_URL = 'https://api.example.com/'
    expect(resolveApiBase('http://localhost:3001')).toBe('https://api.example.com')
  })

  it('uses production default on railway hosts', () => {
    delete process.env.API_BASE_URL
    delete process.env.NUXT_PUBLIC_API_BASE
    expect(resolveApiBase(undefined, 'besliswijzer-production.up.railway.app')).toBe(
      DEFAULT_PRODUCTION_API_BASE,
    )
  })

  it('falls back to localhost in development', () => {
    delete process.env.API_BASE_URL
    delete process.env.NUXT_PUBLIC_API_BASE
    delete process.env.NODE_ENV
    delete process.env.RAILWAY_ENVIRONMENT
    expect(resolveApiBase('http://localhost:3001', 'localhost:3000')).toBe('http://localhost:3001')
  })
})

describe('resolveOpportunityApiBase', () => {
  it('prefers OPPORTUNITY_API_BASE', () => {
    process.env.OPPORTUNITY_API_BASE = 'https://opp.example.com/'
    expect(resolveOpportunityApiBase()).toBe('https://opp.example.com')
  })

  it('falls back to localhost:3002', () => {
    delete process.env.OPPORTUNITY_API_BASE
    delete process.env.NUXT_OPPORTUNITY_API_BASE
    expect(resolveOpportunityApiBase()).toBe('http://localhost:3002')
  })
})
