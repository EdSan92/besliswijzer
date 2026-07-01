import { eq, isNotNull } from 'drizzle-orm'
import { flows, flowCategories, type Database } from '@besliswijzer/db'

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
