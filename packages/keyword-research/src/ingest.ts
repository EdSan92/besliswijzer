import type { KeywordResearchArtifact } from './artifact.js'
import {
  buildKeywordResearchCacheKey,
  KeywordResearchCache,
  type KeywordResearchCacheOptions,
} from './cache.js'
import { normalizeProviderError } from './errors.js'
import { normalizeProviderResult } from './normalize.js'
import type { KeywordResearchProvider, KeywordResearchRequest } from './types.js'

export type IngestKeywordResearchOptions = {
  provider: KeywordResearchProvider
  request: KeywordResearchRequest
  cache?: KeywordResearchCache
  now?: () => string
}

function defaultNow(): string {
  return new Date().toISOString()
}

export async function ingestKeywordResearch(
  options: IngestKeywordResearchOptions,
): Promise<KeywordResearchArtifact> {
  const { provider, request, cache } = options
  const now = options.now ?? defaultNow
  const cacheKey = buildKeywordResearchCacheKey(
    request.primaryKeyword,
    request.language,
    provider.name,
  )

  const cached = cache?.get(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const result = await provider.research(request)
    const artifact = normalizeProviderResult(result, {
      provider: provider.name,
      retrievedAt: now(),
      language: request.language,
    })

    cache?.set(cacheKey, artifact)
    return artifact
  } catch (error) {
    throw normalizeProviderError(error, provider.name)
  }
}

export function createKeywordResearchCache(
  options: KeywordResearchCacheOptions,
): KeywordResearchCache {
  return new KeywordResearchCache(options)
}

export const DEFAULT_KEYWORD_RESEARCH_CACHE_TTL_MS = 86_400_000
