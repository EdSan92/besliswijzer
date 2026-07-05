import { eq } from 'drizzle-orm'
import {
  flowCategories,
  flowNodes,
  flowOptions,
  flowResults,
  flowRules,
  flows,
  type Database,
} from '@besliswijzer/db'
import {
  type FlowDefinition,
  type FlowImportRequest,
  validateFlowDefinition,
} from '@besliswijzer/flow-schema'
import { ensureDraftVersion, getDraftVersion, loadFlowSnapshot } from './flow-service.js'
import { publishFlow } from './publish-service.js'

export class FlowImportError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message)
    this.name = 'FlowImportError'
  }
}

async function resolveCategoryId(db: Database, categorySlug?: string | null) {
  if (!categorySlug) return null

  const category = await db.query.flowCategories.findFirst({
    where: eq(flowCategories.slug, categorySlug),
  })
  if (!category) {
    throw new FlowImportError(`Category slug "${categorySlug}" not found`, 404)
  }
  return category.id
}

async function clearDraftContent(db: Database, draftVersionId: string) {
  await db.delete(flowNodes).where(eq(flowNodes.flowVersionId, draftVersionId))
  await db.delete(flowRules).where(eq(flowRules.flowVersionId, draftVersionId))
  await db.delete(flowResults).where(eq(flowResults.flowVersionId, draftVersionId))
}

async function insertDraftContent(db: Database, draftVersionId: string, flow: FlowDefinition) {
  for (const node of flow.nodes) {
    const [insertedNode] = await db
      .insert(flowNodes)
      .values({
        flowVersionId: draftVersionId,
        nodeKey: node.nodeKey,
        type: node.type,
        title: node.title,
        content: node.content,
        sortOrder: node.sortOrder,
        isEntry: node.isEntry,
      })
      .returning()

    if (node.options.length > 0) {
      await db.insert(flowOptions).values(
        node.options.map((option) => ({
          nodeId: insertedNode!.id,
          optionKey: option.optionKey,
          label: option.label,
          value: option.value,
          sortOrder: option.sortOrder,
        })),
      )
    }
  }

  if (flow.rules.length > 0) {
    await db.insert(flowRules).values(
      flow.rules.map((rule) => ({
        flowVersionId: draftVersionId,
        fromNodeKey: rule.fromNodeKey,
        ruleType: rule.ruleType,
        condition: rule.condition,
        targetNodeKey: rule.targetNodeKey ?? null,
        targetResultKey: rule.targetResultKey ?? null,
        priority: rule.priority,
      })),
    )
  }

  if (flow.results.length > 0) {
    await db.insert(flowResults).values(
      flow.results.map((result) => ({
        flowVersionId: draftVersionId,
        resultKey: result.resultKey,
        title: result.title,
        body: result.body,
        ctas: result.ctas,
      })),
    )
  }
}

export async function exportFlowDefinition(db: Database, flowId: string): Promise<FlowDefinition> {
  const flow = await db.query.flows.findFirst({
    where: eq(flows.id, flowId),
    with: { category: true },
  })
  if (!flow) throw new FlowImportError('Flow not found', 404)

  const draft = await getDraftVersion(db, flowId)
  if (!draft) throw new FlowImportError('Draft not found', 404)

  const snapshot = await loadFlowSnapshot(db, flowId, draft.id)
  if (!snapshot) throw new FlowImportError('Draft snapshot not found', 404)

  return {
    slug: flow.slug,
    title: flow.title,
    categorySlug: flow.category?.slug ?? null,
    seo: snapshot.seo,
    nodes: snapshot.nodes.map(({ id: _id, options, ...node }) => ({
      ...node,
      options: options.map(({ id: _optionId, ...option }) => option),
    })),
    rules: snapshot.rules.map(({ id: _id, ...rule }) => rule),
    results: snapshot.results.map(({ id: _id, ...result }) => result),
  }
}

export async function importFlowDefinition(
  db: Database,
  request: FlowImportRequest,
): Promise<{
  flowId: string
  slug: string
  created: boolean
  published: boolean
  versionNumber: number | null
}> {
  const validationErrors = validateFlowDefinition(request.flow)
  if (validationErrors.length > 0) {
    throw new FlowImportError(validationErrors.join('; '))
  }

  const categoryId = await resolveCategoryId(db, request.flow.categorySlug)
  const seo = request.flow.seo ?? {
    title: request.flow.title,
    description: request.flow.title,
  }

  const existing = await db.query.flows.findFirst({
    where: eq(flows.slug, request.flow.slug),
  })

  if (existing && !request.overwrite) {
    throw new FlowImportError(
      `Flow "${request.flow.slug}" already exists. Set overwrite: true to replace the draft.`,
      409,
    )
  }

  let flowId: string
  let created = false

  if (existing) {
    flowId = existing.id
    await db
      .update(flows)
      .set({
        title: request.flow.title,
        categoryId,
        seoMeta: seo,
        updatedAt: new Date(),
      })
      .where(eq(flows.id, flowId))
  } else {
    const [flow] = await db
      .insert(flows)
      .values({
        slug: request.flow.slug,
        title: request.flow.title,
        categoryId,
        seoMeta: seo,
      })
      .returning()
    flowId = flow!.id
    created = true
  }

  const draft = await ensureDraftVersion(db, flowId)
  await clearDraftContent(db, draft.id)
  await insertDraftContent(db, draft.id, request.flow)

  let versionNumber: number | null = null
  if (request.publish) {
    const published = await publishFlow(db, flowId)
    versionNumber = published.versionNumber
  }

  return {
    flowId,
    slug: request.flow.slug,
    created,
    published: request.publish,
    versionNumber,
  }
}
