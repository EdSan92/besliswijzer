import { and, eq, or } from 'drizzle-orm'
import { flows, flowVersions, type Database } from '@besliswijzer/db'
import type { ProductFlowGroup } from '@besliswijzer/product-schema'

export function selectDeprecatedFlowIds(group: ProductFlowGroup, canonicalFlowId: string): string[] {
  return [...new Set(group.flowIds)].filter((flowId) => flowId !== canonicalFlowId)
}

export async function archiveFlow(
  db: Database,
  flowId: string,
  dryRun = false,
): Promise<string | null> {
  const flow = await db.query.flows.findFirst({
    where: eq(flows.id, flowId),
    columns: { id: true, slug: true, title: true },
  })
  if (!flow) return null

  if (dryRun) return flow.slug

  await db
    .update(flowVersions)
    .set({ status: 'archived' })
    .where(
      and(
        eq(flowVersions.flowId, flowId),
        or(eq(flowVersions.status, 'draft'), eq(flowVersions.status, 'published')),
      ),
    )

  const archivedTitle = flow.title.includes('[archief]') ? flow.title : `${flow.title} [archief]`

  await db
    .update(flows)
    .set({
      currentPublishedVersionId: null,
      title: archivedTitle,
      updatedAt: new Date(),
    })
    .where(eq(flows.id, flowId))

  return flow.slug
}

export async function archiveDeprecatedProductFlows(
  db: Database,
  group: ProductFlowGroup,
  canonicalFlowId: string,
  options: { dryRun?: boolean } = {},
): Promise<string[]> {
  const archivedSlugs: string[] = []

  for (const flowId of selectDeprecatedFlowIds(group, canonicalFlowId)) {
    const slug = await archiveFlow(db, flowId, options.dryRun ?? false)
    if (slug) archivedSlugs.push(slug)
  }

  return archivedSlugs
}

export async function archiveDeprecatedFlowsForGroups(
  db: Database,
  groups: ProductFlowGroup[],
  resolveCanonicalFlowId: (group: ProductFlowGroup) => string | null,
  options: { dryRun?: boolean; productSlug?: string } = {},
): Promise<Array<{ productSlug: string; archivedSlugs: string[] }>> {
  const results: Array<{ productSlug: string; archivedSlugs: string[] }> = []

  for (const group of groups) {
    if (options.productSlug && group.productSlug !== options.productSlug) continue

    const canonicalFlowId = resolveCanonicalFlowId(group)
    if (!canonicalFlowId) continue

    const deprecatedIds = selectDeprecatedFlowIds(group, canonicalFlowId)
    if (deprecatedIds.length === 0) continue

    const archivedSlugs = await archiveDeprecatedProductFlows(db, group, canonicalFlowId, options)
    results.push({ productSlug: group.productSlug, archivedSlugs })
  }

  return results
}
