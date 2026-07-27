export function buildAffiliateClickHref(input: {
  flowSlug: string
  resultKey: string
  ctaId: string
  sessionId: string
}) {
  const params = new URLSearchParams({
    flowSlug: input.flowSlug,
    resultKey: input.resultKey,
    ctaId: input.ctaId,
    sessionId: input.sessionId,
  })
  return `/api/v1/public/affiliate/click?${params.toString()}`
}
