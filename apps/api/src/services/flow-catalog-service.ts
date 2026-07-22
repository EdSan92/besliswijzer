import { isNotNull } from 'drizzle-orm'
import { flows, type Database } from '@besliswijzer/db'
import {
  buildProductFlowGroups,
  buildVisibleFlowSlugSet,
  type FlowCatalogItem,
} from '@besliswijzer/product-schema'

type FlowListItem = {
  id: string
  slug: string
  title: string
}

export async function loadProductFlowGroups(db: Database) {
  const catalog = await db.query.products.findMany({
    with: {
      primaryFlow: true,
      keywords: true,
      pages: true,
    },
  })

  const allFlows = await db.query.flows.findMany({
    columns: { id: true, slug: true, title: true },
  })

  return buildProductFlowGroups(
    catalog.map((product) => ({
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      canonicalName: product.canonicalName,
      categoryId: product.categoryId,
      primaryFlowId: product.primaryFlowId,
      primaryFlowSlug: product.primaryFlow?.slug ?? null,
      pageSlug: product.pages.find((page) => page.status === 'published')?.slug ?? null,
      keywordTerms: product.keywords.map((keyword) => keyword.term),
    })),
    allFlows as FlowCatalogItem[],
  )
}

export async function loadVisiblePublishedFlowSlugs(db: Database): Promise<Set<string>> {
  const publishedFlows = await db.query.flows.findMany({
    where: isNotNull(flows.currentPublishedVersionId),
    columns: { slug: true },
  })

  const groups = await loadProductFlowGroups(db)
  return buildVisibleFlowSlugSet(
    groups,
    publishedFlows.map((flow) => flow.slug),
  )
}

export function filterFlowsForPublicCatalog<T extends FlowListItem>(
  flows: T[],
  visibleSlugs: ReadonlySet<string>,
): T[] {
  return flows.filter((flow) => visibleSlugs.has(flow.slug))
}
