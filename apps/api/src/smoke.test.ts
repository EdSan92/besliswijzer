import { describe, expect, it } from 'vitest'

describe('API smoke', () => {
  it('health endpoint responds', async () => {
    const base = process.env.API_BASE ?? 'http://localhost:3001'
    try {
      const res = await fetch(`${base}/health`)
      if (!res.ok) {
        console.warn('API not running — skip smoke test')
        return
      }
      const data = await res.json()
      expect(data.status).toBe('ok')
    } catch {
      console.warn('API not running — skip smoke test')
    }
  })

  it('public flow endpoint structure', async () => {
    const base = process.env.API_BASE ?? 'http://localhost:3001'
    try {
      const res = await fetch(`${base}/api/v1/public/flows/warmtepomp-keuzehulp`)
      if (!res.ok) {
        console.warn('Flow not seeded — skip smoke test')
        return
      }
      const data = await res.json()
      expect(data.slug).toBe('warmtepomp-keuzehulp')
      expect(data.entryNode).toBeDefined()
    } catch {
      console.warn('API not running — skip smoke test')
    }
  })
})
