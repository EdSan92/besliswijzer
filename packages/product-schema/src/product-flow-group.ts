import { normalizeKeywordTerm } from './product-matcher.js'

export function resolveProductFlowSlug(productSlug: string): string {
  if (productSlug.endsWith('s')) return productSlug
  return `${productSlug}s`
}

export function deriveProductSlugFromKeyword(keyword: string): string {
  const normalized = normalizeKeywordTerm(keyword)
  const token = normalized.split(' ').find((part) => part.length > 2)
  return token ? toProductSlug(token) : toProductSlug(normalized)
}

export function toProductSlug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return cleaned.slice(0, 80) || 'product'
}

export type ProductFlowGroupInput = {
  productId: string
  productSlug: string
  productTitle: string
  canonicalName: string
  categoryId: string | null
  primaryFlowId: string | null
  primaryFlowSlug: string | null
  pageSlug: string | null
  keywordTerms: string[]
}

export type FlowCatalogItem = {
  id: string
  slug: string
  title: string
}

export type ProductFlowGroup = ProductFlowGroupInput & {
  flowIds: string[]
  flowSlugs: string[]
}

export function flowBelongsToProduct(
  flow: FlowCatalogItem,
  product: Pick<ProductFlowGroupInput, 'productSlug' | 'canonicalName' | 'primaryFlowSlug'>,
): boolean {
  const canonical = product.canonicalName.toLowerCase()
  const slug = flow.slug.toLowerCase()
  const title = normalizeKeywordTerm(flow.title)

  if (product.primaryFlowSlug && slug === product.primaryFlowSlug.toLowerCase()) return true
  if (slug === resolveProductFlowSlug(product.productSlug)) return true
  if (slug.includes(canonical)) return true
  if (title.includes(canonical)) return true

  const productSlugNorm = product.productSlug.replace(/-/g, ' ')
  if (title.includes(productSlugNorm)) return true

  return false
}

export function buildProductFlowGroups(
  products: ProductFlowGroupInput[],
  flows: FlowCatalogItem[],
): ProductFlowGroup[] {
  const assignedFlowIds = new Set<string>()
  const groups: ProductFlowGroup[] = []

  for (const product of products) {
    const flowIds: string[] = []
    const flowSlugs: string[] = []

    for (const flow of flows) {
      if (product.primaryFlowId === flow.id || flowBelongsToProduct(flow, product)) {
        flowIds.push(flow.id)
        flowSlugs.push(flow.slug)
        assignedFlowIds.add(flow.id)
      }
    }

    if (flowIds.length === 0 && product.primaryFlowId) {
      const primary = flows.find((flow) => flow.id === product.primaryFlowId)
      if (primary) {
        flowIds.push(primary.id)
        flowSlugs.push(primary.slug)
        assignedFlowIds.add(primary.id)
      }
    }

    if (flowIds.length === 0) continue

    groups.push({
      ...product,
      flowIds,
      flowSlugs,
    })
  }

  const orphanFlows = flows.filter((flow) => !assignedFlowIds.has(flow.id))
  const orphanGroups = new Map<string, ProductFlowGroup>()

  for (const flow of orphanFlows) {
    const productSlug = deriveProductSlugFromKeyword(flow.slug.replace(/-/g, ' '))
    const existing = orphanGroups.get(productSlug)

    if (existing) {
      existing.flowIds.push(flow.id)
      existing.flowSlugs.push(flow.slug)
      if (!existing.keywordTerms.includes(flow.slug)) {
        existing.keywordTerms.push(flow.slug.replace(/-/g, ' '))
      }
      continue
    }

    orphanGroups.set(productSlug, {
      productId: '',
      productSlug,
      productTitle: titleCase(productSlug.replace(/-/g, ' ')),
      canonicalName: productSlug,
      categoryId: null,
      primaryFlowId: null,
      primaryFlowSlug: null,
      pageSlug: null,
      keywordTerms: [flow.slug.replace(/-/g, ' '), flow.title],
      flowIds: [flow.id],
      flowSlugs: [flow.slug],
    })
  }

  return [...groups, ...orphanGroups.values()].sort((a, b) => b.flowIds.length - a.flowIds.length)
}

export function pickCanonicalFlowSlugForGroup(
  group: ProductFlowGroup,
  publishedSlugs: ReadonlySet<string>,
): string | null {
  const preferred = resolveProductFlowSlug(group.productSlug)
  if (publishedSlugs.has(preferred)) return preferred

  const publishedInGroup = group.flowSlugs.filter((slug) => publishedSlugs.has(slug))
  if (publishedInGroup.length === 0) return null
  if (publishedInGroup.length === 1) return publishedInGroup[0]!

  if (group.primaryFlowSlug && publishedSlugs.has(group.primaryFlowSlug)) {
    return group.primaryFlowSlug
  }

  const productPrefixMatches = publishedInGroup.filter((slug) => slug.startsWith(group.productSlug))
  if (productPrefixMatches.length > 0) {
    return [...productPrefixMatches].sort((a, b) => a.length - b.length)[0]!
  }

  return [...publishedInGroup].sort((a, b) => a.length - b.length)[0] ?? null
}

export function buildVisibleFlowSlugSet(
  groups: ProductFlowGroup[],
  publishedFlowSlugs: string[],
): Set<string> {
  const published = new Set(publishedFlowSlugs)
  const visible = new Set<string>()
  const groupedSlugs = new Set(groups.flatMap((group) => group.flowSlugs))

  for (const group of groups) {
    const canonical = pickCanonicalFlowSlugForGroup(group, published)
    if (canonical) visible.add(canonical)
  }

  for (const slug of publishedFlowSlugs) {
    if (!groupedSlugs.has(slug) && !visible.has(slug)) {
      visible.add(slug)
    }
  }

  return visible
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
