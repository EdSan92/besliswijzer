import { describe, expect, it } from 'vitest'
import { RateLimiter } from './rate-limiter.js'

describe('RateLimiter', () => {
  it('enforces minimum interval between calls', async () => {
    const limiter = new RateLimiter(50)
    const timestamps: number[] = []

    await limiter.throttle(async () => {
      timestamps.push(Date.now())
    })
    await limiter.throttle(async () => {
      timestamps.push(Date.now())
    })

    expect(timestamps).toHaveLength(2)
    expect(timestamps[1]! - timestamps[0]!).toBeGreaterThanOrEqual(45)
  })
})
