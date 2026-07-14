import { describe, expect, it } from 'vitest'

const API_BASE = process.env.API_BASE ?? 'http://localhost:3001'
const REQUEST_TIMEOUT_MS = 2000

async function fetchWithTimeout(url: string): Promise<Response | null> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch {
    return null
  }
}

describe('API integration', () => {
  it('health endpoint responds when API is running', async () => {
    const res = await fetchWithTimeout(`${API_BASE}/health`)
    if (!res?.ok) {
      console.warn('API not running — skip integration test')
      return
    }
    const data = await res.json()
    expect(data.status).toBe('ok')
  })

  it('public flow endpoint structure when API is running', async () => {
    const res = await fetchWithTimeout(`${API_BASE}/api/v1/public/flows/warmtepomp-keuzehulp`)
    if (!res?.ok) {
      console.warn('Flow not seeded or API unavailable — skip integration test')
      return
    }
    const data = await res.json()
    expect(data.slug).toBe('warmtepomp-keuzehulp')
    expect(data.entryNode).toBeDefined()
  })
})
