import type { KeywordResearchArtifact } from './artifact.js'

type CacheEntry = {
  expiresAt: number
  value: KeywordResearchArtifact
}

export type KeywordResearchCacheOptions = {
  ttlMs: number
  now?: () => number
}

export class KeywordResearchCache {
  private readonly ttlMs: number
  private readonly now: () => number
  private readonly entries = new Map<string, CacheEntry>()

  constructor(options: KeywordResearchCacheOptions) {
    this.ttlMs = options.ttlMs
    this.now = options.now ?? (() => Date.now())
  }

  get(key: string): KeywordResearchArtifact | null {
    const entry = this.entries.get(key)
    if (!entry) {
      return null
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key)
      return null
    }

    return entry.value
  }

  set(key: string, value: KeywordResearchArtifact): void {
    this.entries.set(key, {
      value,
      expiresAt: this.now() + this.ttlMs,
    })
  }
}

export function buildKeywordResearchCacheKey(
  primaryKeyword: string,
  language: string,
  provider: string,
): string {
  return `${provider}:${language}:${primaryKeyword.trim().toLowerCase()}`
}
