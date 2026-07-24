import { eq } from 'drizzle-orm'
import {
  contentBlockSchema,
  resolveProductFlowSlug,
  type ContentBlock,
  type ProductFlowGroup,
} from '@besliswijzer/product-schema'
import { mergeFlowDefinitions, validateFlowDefinition, type FlowDefinition } from '@besliswijzer/flow-schema'
import { productPages, products, type Database } from '@besliswijzer/db'
import { exportFlowDefinition, importFlowDefinition } from './flow-import-export-service.js'
import { archiveDeprecatedProductFlows } from './archive-product-flows-service.js'

export type MergeProductFlowsOptions = {
  dryRun?: boolean
  publish?: boolean
  productSlug?: string
  skipArchive?: boolean
}

export type MergeProductFlowsResult = {
  productSlug: string
  canonicalFlowSlug: string
  mergedFrom: string[]
  flowId?: string
  pageSlug?: string | null
  archivedSlugs?: string[]
  skippedReason?: string
}

function parseBlocks(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw)) return []
  const blocks: ContentBlock[] = []
  for (const item of raw) {
    const parsed = contentBlockSchema.safeParse(item)
    if (parsed.success) blocks.push(parsed.data)
  }
  return blocks
}

async function exportPublishedOrDraftFlow(
  db: Database,
  flowId: string,
): Promise<FlowDefinition | null> {
  try {
    return await exportFlowDefinition(db, flowId)
  } catch {
    const flow = await db.query.flows.findFirst({
      where: (table, { eq: equals }) => equals(table.id, flowId),
      with: {
        versions: {
          with: { nodes: { with: { options: true } }, rules: true, results: true },
        },
        category: true,
      },
    })

    const published = flow?.versions.find((version) => version.status === 'published')
    const version = published ?? flow?.versions.find((version) => version.status === 'draft')
    if (!flow || !version) return null

    return {
      slug: flow.slug,
      title: flow.title,
      categorySlug: flow.category?.slug ?? null,
      seo: (flow.seoMeta as FlowDefinition['seo']) ?? {
        title: flow.title,
        description: flow.title,
      },
      nodes: version.nodes.map(({ options, ...node }) => ({
        nodeKey: node.nodeKey,
        type: node.type,
        title: node.title,
        content: (node.content ?? {}) as FlowDefinition['nodes'][number]['content'],
        sortOrder: node.sortOrder,
        isEntry: node.isEntry,
        options: options.map(({ optionKey, label, value, sortOrder }) => ({
          optionKey,
          label,
          value,
          sortOrder,
        })),
      })),
      rules: version.rules.map(({ fromNodeKey, ruleType, condition, targetNodeKey, targetResultKey, priority }) => ({
        fromNodeKey,
        ruleType,
        condition: condition as Record<string, unknown>,
        targetNodeKey,
        targetResultKey,
        priority,
      })),
      results: version.results.map(({ resultKey, title, body, ctas }) => ({
        resultKey,
        title,
        body: body as Record<string, unknown>,
        ctas: ctas as FlowDefinition['results'][number]['ctas'],
      })),
    }
  }
}

async function ensureProductRecord(
  db: Database,
  group: ProductFlowGroup,
  primaryFlowId: string,
): Promise<string> {
  if (group.productId) {
    await db
      .update(products)
      .set({
        primaryFlowId,
        title: group.productTitle,
        canonicalName: group.canonicalName,
        categoryId: group.categoryId,
        updatedAt: new Date(),
      })
      .where(eq(products.id, group.productId))
    return group.productId
  }

  const existing = await db.query.products.findFirst({
    where: eq(products.slug, group.productSlug),
  })
  if (existing) {
    await db
      .update(products)
      .set({
        primaryFlowId,
        title: group.productTitle,
        canonicalName: group.canonicalName,
        updatedAt: new Date(),
      })
      .where(eq(products.id, existing.id))
    return existing.id
  }

  const [created] = await db
    .insert(products)
    .values({
      slug: group.productSlug,
      title: group.productTitle,
      canonicalName: group.canonicalName,
      categoryId: group.categoryId,
      primaryFlowId,
      status: 'published',
    })
    .returning()

  return created!.id
}

async function updateProductPageFlowBlock(
  db: Database,
  pageSlug: string,
  flowId: string,
  flowSlug: string,
): Promise<void> {
  const page = await db.query.productPages.findFirst({
    where: eq(productPages.slug, pageSlug),
  })
  if (!page) return

  const blocks = parseBlocks(page.blocks)
  const flowBlock = blocks.find((block) => block.type === 'flow')

  if (flowBlock?.type === 'flow') {
    flowBlock.data.flowId = flowId
    flowBlock.data.flowSlug = flowSlug
  } else {
    blocks.push({
      id: 'blk_flow',
      type: 'flow',
      sortOrder: blocks.length,
      visible: true,
      source: 'manual',
      data: {
        flowId,
        flowSlug,
        anchorId: 'keuzehulp',
        ctaLabel: 'Start de keuzehulp',
        displayMode: 'section',
      },
    })
  }

  const layout = (page.layout ?? { blockOrder: [] }) as { blockOrder?: string[] }
  const blockOrder = layout.blockOrder ?? []
  if (!blockOrder.includes('blk_flow')) {
    blockOrder.push('blk_flow')
  }

  await db
    .update(productPages)
    .set({
      blocks,
      layout: { ...layout, blockOrder },
      updatedAt: new Date(),
    })
    .where(eq(productPages.id, page.id))
}

export async function mergeProductFlowGroup(
  db: Database,
  group: ProductFlowGroup,
  options: MergeProductFlowsOptions = {},
): Promise<MergeProductFlowsResult> {
  const canonicalFlowSlug = resolveCanonicalFlowSlug(group)
  const uniqueFlowIds = [...new Set(group.flowIds)]

  if (uniqueFlowIds.length === 0) {
    return {
      productSlug: group.productSlug,
      canonicalFlowSlug,
      mergedFrom: [],
      skippedReason: 'no flows',
    }
  }

  const alreadyCanonical =
    uniqueFlowIds.length === 1 && group.flowSlugs[0] === canonicalFlowSlug && group.primaryFlowSlug === canonicalFlowSlug

  if (alreadyCanonical && group.pageSlug && group.primaryFlowId) {
    return {
      productSlug: group.productSlug,
      canonicalFlowSlug,
      mergedFrom: group.flowSlugs,
      flowId: group.primaryFlowId,
      pageSlug: group.pageSlug,
      skippedReason: 'already canonical',
    }
  }

  const exported: FlowDefinition[] = []
  for (const flowId of uniqueFlowIds) {
    const definition = await exportPublishedOrDraftFlow(db, flowId)
    if (definition) exported.push(definition)
  }

  if (exported.length === 0) {
    return {
      productSlug: group.productSlug,
      canonicalFlowSlug,
      mergedFrom: group.flowSlugs,
      skippedReason: 'could not export flows',
    }
  }

  const categorySlug =
    exported.find((flow) => typeof flow.categorySlug === 'string')?.categorySlug ?? null
  const merged = mergeFlowDefinitions({
    targetSlug: canonicalFlowSlug,
    targetTitle: `${group.productTitle} kiezen`,
    categorySlug,
    sources: exported,
  })

  const validationErrors = validateFlowDefinition(merged)
  if (validationErrors.length > 0) {
    return {
      productSlug: group.productSlug,
      canonicalFlowSlug,
      mergedFrom: group.flowSlugs,
      skippedReason: validationErrors.join('; '),
    }
  }

  if (options.dryRun) {
    const canonicalFlowId = resolveCanonicalFlowId(group, canonicalFlowSlug)
    const archivedSlugs =
      !options.skipArchive && canonicalFlowId
        ? await archiveDeprecatedProductFlows(db, group, canonicalFlowId, { dryRun: true })
        : group.flowSlugs.filter((slug) => slug !== canonicalFlowSlug)

    return {
      productSlug: group.productSlug,
      canonicalFlowSlug,
      mergedFrom: group.flowSlugs,
      pageSlug: group.pageSlug,
      flowId: canonicalFlowId ?? undefined,
      archivedSlugs,
    }
  }

  const imported = await importFlowDefinition(db, {
    publish: options.publish ?? true,
    overwrite: true,
    flow: merged,
  })

  const productId = await ensureProductRecord(db, group, imported.flowId)

  if (group.pageSlug) {
    await updateProductPageFlowBlock(db, group.pageSlug, imported.flowId, imported.slug)
  } else {
    const page = await db.query.productPages.findFirst({
      where: eq(productPages.productId, productId),
    })
    if (page) {
      await updateProductPageFlowBlock(db, page.slug, imported.flowId, imported.slug)
    }
  }

  const archivedSlugs = options.skipArchive
    ? []
    : await archiveDeprecatedProductFlows(db, group, imported.flowId, { dryRun: false })

  return {
    productSlug: group.productSlug,
    canonicalFlowSlug: imported.slug,
    mergedFrom: group.flowSlugs,
    flowId: imported.flowId,
    pageSlug: group.pageSlug,
    archivedSlugs,
  }
}

function resolveCanonicalFlowSlug(group: ProductFlowGroup): string {
  if (group.primaryFlowSlug && group.flowSlugs.includes(group.primaryFlowSlug)) {
    return group.primaryFlowSlug
  }

  const preferred = resolveProductFlowSlug(group.productSlug)
  if (group.flowSlugs.includes(preferred)) return preferred

  return preferred
}

function resolveCanonicalFlowId(group: ProductFlowGroup, canonicalFlowSlug: string): string | null {
  if (group.primaryFlowId && group.primaryFlowSlug === canonicalFlowSlug) {
    return group.primaryFlowId
  }

  const index = group.flowSlugs.indexOf(canonicalFlowSlug)
  if (index >= 0) return group.flowIds[index] ?? null

  return group.primaryFlowId
}

export function resolveCanonicalFlowSlugForGroup(group: ProductFlowGroup): string {
  return resolveCanonicalFlowSlug(group)
}

export function resolveCanonicalFlowIdForGroup(group: ProductFlowGroup): string | null {
  return resolveCanonicalFlowId(group, resolveCanonicalFlowSlug(group))
}

export async function mergeAllProductFlows(
  db: Database,
  groups: ProductFlowGroup[],
  options: MergeProductFlowsOptions = {},
): Promise<MergeProductFlowsResult[]> {
  const results: MergeProductFlowsResult[] = []

  for (const group of groups) {
    if (options.productSlug && group.productSlug !== options.productSlug) continue

    const canonicalFlowSlug = resolveCanonicalFlowSlug(group)
    const needsMerge =
      group.flowIds.length >= 2 ||
      (group.flowIds.length === 1 && group.flowSlugs[0] !== canonicalFlowSlug)

    if (!needsMerge) {
      const canonicalFlowId = resolveCanonicalFlowId(group, canonicalFlowSlug)
      const archivedSlugs =
        !options.skipArchive && canonicalFlowId
          ? await archiveDeprecatedProductFlows(db, group, canonicalFlowId, {
              dryRun: options.dryRun,
            })
          : []

      results.push({
        productSlug: group.productSlug,
        canonicalFlowSlug,
        mergedFrom: group.flowSlugs,
        flowId: canonicalFlowId ?? undefined,
        pageSlug: group.pageSlug,
        archivedSlugs,
        skippedReason:
          archivedSlugs.length > 0 ? 'archived deprecated flows only' : 'already canonical single flow',
      })
      continue
    }

    results.push(await mergeProductFlowGroup(db, group, options))
  }

  return results
}
