const KNOWN_FLOW_PAGE_LINKS: Record<string, string> = {
  robotmaaiers: 'robotmaaier-kiezen',
  airfryers: 'airfryer-kiezen',
  robotstofzuigers: 'robotstofzuiger-kiezen',
  'mesh-wifi': 'mesh-wifi-kiezen',
}

function mergedPageLinks(pageLinks: Record<string, string>): Record<string, string> {
  return { ...KNOWN_FLOW_PAGE_LINKS, ...pageLinks }
}

export function resolveFlowHref(
  flowSlug: string,
  pageLinks: Record<string, string> = {},
): string {
  const pageSlug = mergedPageLinks(pageLinks)[flowSlug]
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

const PRODUCT_PAGE_LINK_LABELS: Record<string, string> = {
  robotmaaiers: 'Meer over robotmaaiers',
  airfryers: 'Meer over airfryers',
  robotstofzuigers: 'Meer over robotstofzuigers',
  'mesh-wifi': 'Meer over mesh wifi',
}

export function productPageLinkLabel(flowSlug: string): string {
  return PRODUCT_PAGE_LINK_LABELS[flowSlug] ?? 'Meer informatie'
}
