export function resolveFlowHref(
  flowSlug: string,
  pageLinks: Record<string, string> = {},
): string {
  const pageSlug = pageLinks[flowSlug]
  return pageSlug ? `/${pageSlug}` : `/flows/${flowSlug}`
}
