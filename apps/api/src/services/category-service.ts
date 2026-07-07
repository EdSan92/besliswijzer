import { eq, isNotNull, sql } from 'drizzle-orm'
import { analyticsEvents, flows, flowCategories, type Database } from '@besliswijzer/db'
import type { FlowSearchResult, PopularFlowItem } from '@besliswijzer/flow-schema'

export async function listPublishedFlowsByCategory(db: Database) {
  const categories = await db.query.flowCategories.findMany({
    orderBy: (c, { asc: ascFn }) => [ascFn(c.sortOrder), ascFn(c.title)],
    with: {
      flows: {
        where: isNotNull(flows.currentPublishedVersionId),
        orderBy: (f, { asc: ascFn }) => [ascFn(f.title)],
      },
    },
  })

  return categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    title: category.title,
    description: category.description,
    flows: category.flows.map((flow) => ({
      id: flow.id,
      slug: flow.slug,
      title: flow.title,
      seo: flow.seoMeta,
    })),
  }))
}

export async function getCategoryWithFlows(db: Database, slug: string) {
  const category = await db.query.flowCategories.findFirst({
    where: eq(flowCategories.slug, slug),
    with: {
      flows: {
        where: isNotNull(flows.currentPublishedVersionId),
        orderBy: (f, { asc: ascFn }) => [ascFn(f.title)],
      },
    },
  })

  if (!category) return null

  return {
    id: category.id,
    slug: category.slug,
    title: category.title,
    description: category.description,
    flows: category.flows.map((flow) => ({
      id: flow.id,
      slug: flow.slug,
      title: flow.title,
      seo: flow.seoMeta,
    })),
  }
}

export async function listUncategorizedPublishedFlows(db: Database) {
  const allFlows = await db.query.flows.findMany({
    where: isNotNull(flows.currentPublishedVersionId),
    orderBy: (f, { asc: ascFn }) => [ascFn(f.title)],
  })

  return allFlows
    .filter((flow) => !flow.categoryId)
    .map((flow) => ({
      id: flow.id,
      slug: flow.slug,
      title: flow.title,
      seo: flow.seoMeta,
    }))
}

export async function listPopularPublishedFlows(db: Database, limit = 6): Promise<PopularFlowItem[]> {
  const publishedFlows = await db.query.flows.findMany({
    where: isNotNull(flows.currentPublishedVersionId),
    with: { category: true },
    orderBy: (f, { asc }) => [asc(f.title)],
  })

  if (publishedFlows.length === 0) return []

  const startCounts = await db
    .select({
      flowId: analyticsEvents.flowId,
      starts: sql<number>`count(*)::int`,
    })
    .from(analyticsEvents)
    .where(eq(analyticsEvents.eventType, 'flow_start'))
    .groupBy(analyticsEvents.flowId)

  const startsByFlowId = new Map(startCounts.map((row) => [row.flowId, row.starts]))

  return publishedFlows
    .map((flow) => ({
      id: flow.id,
      slug: flow.slug,
      title: flow.title,
      category: flow.category?.title ?? 'Keuzehulp',
      starts: startsByFlowId.get(flow.id) ?? 0,
    }))
    .sort((a, b) => b.starts - a.starts || a.title.localeCompare(b.title, 'nl'))
    .slice(0, limit)
}

export async function searchPublishedFlows(
  db: Database,
  query: string,
  limit = 8,
): Promise<FlowSearchResult[]> {
  const term = query.trim()
  if (term.length < 2) return []

  const pattern = `%${term}%`
  const prefixPattern = `${term}%`

  const rows = await db.execute<{
    id: string
    slug: string
    title: string
    category_title: string | null
    description: string | null
    rank: number
  }>(sql`
    SELECT
      f.id,
      f.slug,
      f.title,
      c.title AS category_title,
      f.seo_meta->>'description' AS description,
      CASE
        WHEN f.title ILIKE ${prefixPattern} THEN 0
        WHEN f.title ILIKE ${pattern} THEN 1
        WHEN c.title ILIKE ${pattern} THEN 2
        ELSE 3
      END AS rank
    FROM flows f
    LEFT JOIN flow_categories c ON c.id = f.category_id
    WHERE f.current_published_version_id IS NOT NULL
      AND (
        f.title ILIKE ${pattern}
        OR f.slug ILIKE ${pattern}
        OR c.title ILIKE ${pattern}
        OR f.seo_meta->>'title' ILIKE ${pattern}
        OR f.seo_meta->>'description' ILIKE ${pattern}
      )
    ORDER BY rank ASC, f.title ASC
    LIMIT ${limit}
  `)

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category_title ?? 'Keuzehulp',
    description: row.description,
  }))
}
