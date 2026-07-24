export function resolveFlowHref(
  flowSlug: string,
  pageLinks: Record<string, string> = {},
): string {
  const pageSlug = pageLinks[flowSlug]
  return pageSlug ? `/${pageSlug}` : `/flows/${flowSlug}`
}

/** Returns the linked SEO product page, or null when the flow has no product page mapping. */
export function resolveProductPageLink(
  flowSlug: string,
  pageLinks: Record<string, string> = {},
): string | null {
  const href = resolveFlowHref(flowSlug, pageLinks)
  return href === `/flows/${flowSlug}` ? null : href
}
