export class RateLimiter {
  private lastCallAt = 0

  constructor(private readonly minIntervalMs: number) {}

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const waitMs = this.lastCallAt + this.minIntervalMs - now
    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs))
    this.lastCallAt = Date.now()
    return fn()
  }
}
