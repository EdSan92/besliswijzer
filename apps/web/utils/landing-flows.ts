import type { PopularFlowItem } from '@besliswijzer/flow-schema'

type CategoryFlowSource = {
  categories: Array<{
    title: string
    flows: Array<{ id: string; slug: string; title: string }>
  }>
  uncategorized: Array<{ id: string; slug: string; title: string }>
}

export function flattenPublishedFlows(source: CategoryFlowSource): PopularFlowItem[] {
  const items: PopularFlowItem[] = []

  for (const category of source.categories) {
    for (const flow of category.flows) {
      items.push({
        id: flow.id,
        slug: flow.slug,
        title: flow.title,
        category: category.title,
        starts: 0,
      })
    }
  }

  for (const flow of source.uncategorized) {
    items.push({
      id: flow.id,
      slug: flow.slug,
      title: flow.title,
      category: 'Keuzehulp',
      starts: 0,
    })
  }

  return items
}

export function resolvePopularFlows(
  fromPopular: PopularFlowItem[] | undefined,
  source: CategoryFlowSource,
  limit = 6,
): PopularFlowItem[] {
  if (fromPopular?.length) return fromPopular.slice(0, limit)

  const fromCategories = flattenPublishedFlows(source)
  if (fromCategories.length) return fromCategories.slice(0, limit)

  return []
}
