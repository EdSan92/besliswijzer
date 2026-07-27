import type { FlowSnapshot } from '@besliswijzer/flow-schema'
import type { z } from 'zod'
import { affiliateClickQuerySchema } from '@besliswijzer/flow-schema'

export type AffiliateClickQuery = z.infer<typeof affiliateClickQuerySchema>

export type AffiliateDestination = {
  url: string
  flowId: string
  flowVersionId: string
  resultKey: string
  ctaId: string
  trackingId?: string
}

export function resolveAffiliateDestination(
  snapshot: FlowSnapshot,
  query: AffiliateClickQuery,
): AffiliateDestination | null {
  if (snapshot.slug !== query.flowSlug) return null

  const result = snapshot.results.find((item) => item.resultKey === query.resultKey)
  if (!result) return null

  const cta = result.ctas.find((item) => item.id === query.ctaId && item.type === 'affiliate')
  if (!cta) return null

  return {
    url: cta.url,
    flowId: snapshot.flowId,
    flowVersionId: snapshot.versionId,
    resultKey: query.resultKey,
    ctaId: query.ctaId,
    trackingId: cta.trackingId,
  }
}
