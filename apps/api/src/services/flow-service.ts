import { and, eq } from 'drizzle-orm'
import {
  flowNodes,
  flowOptions,
  flowResults,
  flowRules,
  flowVersions,
  flows,
  type Database,
} from '@besliswijzer/db'
import type { FlowNode, FlowResult, FlowRule, FlowSnapshot, SeoMeta } from '@besliswijzer/flow-schema'

function mapNode(
  node: typeof flowNodes.$inferSelect & { options?: (typeof flowOptions.$inferSelect)[] },
): FlowNode {
  return {
    id: node.id,
    nodeKey: node.nodeKey,
    type: node.type,
    title: node.title,
    content: (node.content ?? {}) as FlowNode['content'],
    sortOrder: node.sortOrder,
    isEntry: node.isEntry,
    options: (node.options ?? []).map((opt) => ({
      id: opt.id,
      optionKey: opt.optionKey,
      label: opt.label,
      value: opt.value,
      sortOrder: opt.sortOrder,
    })),
  }
}

export async function loadFlowSnapshot(
  db: Database,
  flowId: string,
  versionId: string,
): Promise<FlowSnapshot | null> {
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, flowId) })
  const version = await db.query.flowVersions.findFirst({
    where: and(eq(flowVersions.id, versionId), eq(flowVersions.flowId, flowId)),
  })
  if (!flow || !version) return null

  const nodes = await db.query.flowNodes.findMany({
    where: eq(flowNodes.flowVersionId, versionId),
    with: { options: true },
    orderBy: (n, { asc }) => [asc(n.sortOrder)],
  })

  const rules = await db.query.flowRules.findMany({
    where: eq(flowRules.flowVersionId, versionId),
  })

  const results = await db.query.flowResults.findMany({
    where: eq(flowResults.flowVersionId, versionId),
  })

  return {
    flowId: flow.id,
    versionId: version.id,
    versionNumber: version.versionNumber,
    slug: flow.slug,
    title: flow.title,
    seo: flow.seoMeta as SeoMeta,
    nodes: nodes.map(mapNode),
    rules: rules.map(
      (rule): FlowRule => ({
        id: rule.id,
        fromNodeKey: rule.fromNodeKey,
        ruleType: rule.ruleType,
        condition: rule.condition as Record<string, unknown>,
        targetNodeKey: rule.targetNodeKey,
        targetResultKey: rule.targetResultKey,
        priority: rule.priority,
      }),
    ),
    results: results.map(
      (result): FlowResult => ({
        id: result.id,
        resultKey: result.resultKey,
        title: result.title,
        body: result.body as Record<string, unknown>,
        ctas: result.ctas as FlowResult['ctas'],
      }),
    ),
  }
}

export async function getPublishedVersion(
  db: Database,
  slug: string,
  versionNumber?: number,
) {
  const flow = await db.query.flows.findFirst({ where: eq(flows.slug, slug) })
  if (!flow) return null

  if (versionNumber !== undefined) {
    const version = await db.query.flowVersions.findFirst({
      where: and(
        eq(flowVersions.flowId, flow.id),
        eq(flowVersions.versionNumber, versionNumber),
        eq(flowVersions.status, 'published'),
      ),
    })
    return version ? { flow, version } : null
  }

  if (!flow.currentPublishedVersionId) return null

  const version = await db.query.flowVersions.findFirst({
    where: eq(flowVersions.id, flow.currentPublishedVersionId),
  })
  return version ? { flow, version } : null
}

export async function getDraftVersion(db: Database, flowId: string) {
  return db.query.flowVersions.findFirst({
    where: and(eq(flowVersions.flowId, flowId), eq(flowVersions.status, 'draft')),
  })
}

export async function ensureDraftVersion(db: Database, flowId: string) {
  const existing = await getDraftVersion(db, flowId)
  if (existing) return existing

  const [draft] = await db
    .insert(flowVersions)
    .values({ flowId, versionNumber: 0, status: 'draft' })
    .returning()
  return draft!
}

export function stripRulesFromSnapshot(snapshot: FlowSnapshot) {
  const { rules: _rules, results: _results, ...rest } = snapshot
  return rest
}

export function stripSensitiveFromNode(node: FlowNode): FlowNode {
  return node
}
