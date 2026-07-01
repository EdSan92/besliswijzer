import { eq } from 'drizzle-orm'
import {
  flowNodes,
  flowOptions,
  flowResults,
  flowRules,
  flowVersions,
  flows,
  type Database,
} from '@besliswijzer/db'

export async function publishFlow(db: Database, flowId: string) {
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, flowId) })
  if (!flow) throw new Error('Flow not found')

  const draftVersion = await db.query.flowVersions.findFirst({
    where: (v, { and, eq: e }) => and(e(v.flowId, flowId), e(v.status, 'draft')),
  })
  if (!draftVersion) throw new Error('No draft version found')

  const latestPublished = await db.query.flowVersions.findMany({
    where: (v, { and, eq: e }) => and(e(v.flowId, flowId), e(v.status, 'published')),
  })
  const nextVersionNumber =
    latestPublished.reduce((max, v) => Math.max(max, v.versionNumber), 0) + 1

  const [publishedVersion] = await db
    .insert(flowVersions)
    .values({
      flowId,
      versionNumber: nextVersionNumber,
      status: 'published',
      config: draftVersion.config,
      publishedAt: new Date(),
    })
    .returning()

  const draftNodes = await db.query.flowNodes.findMany({
    where: eq(flowNodes.flowVersionId, draftVersion.id),
    with: { options: true },
  })

  for (const node of draftNodes) {
    const [newNode] = await db
      .insert(flowNodes)
      .values({
        flowVersionId: publishedVersion!.id,
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
        node.options.map((opt) => ({
          nodeId: newNode!.id,
          optionKey: opt.optionKey,
          label: opt.label,
          value: opt.value,
          sortOrder: opt.sortOrder,
        })),
      )
    }
  }

  const draftRulesList = await db.query.flowRules.findMany({
    where: eq(flowRules.flowVersionId, draftVersion.id),
  })
  if (draftRulesList.length > 0) {
    await db.insert(flowRules).values(
      draftRulesList.map((rule) => ({
        flowVersionId: publishedVersion!.id,
        fromNodeKey: rule.fromNodeKey,
        ruleType: rule.ruleType,
        condition: rule.condition,
        targetNodeKey: rule.targetNodeKey,
        targetResultKey: rule.targetResultKey,
        priority: rule.priority,
      })),
    )
  }

  const draftResultsList = await db.query.flowResults.findMany({
    where: eq(flowResults.flowVersionId, draftVersion.id),
  })
  if (draftResultsList.length > 0) {
    await db.insert(flowResults).values(
      draftResultsList.map((result) => ({
        flowVersionId: publishedVersion!.id,
        resultKey: result.resultKey,
        title: result.title,
        body: result.body,
        ctas: result.ctas,
      })),
    )
  }

  await db
    .update(flows)
    .set({ currentPublishedVersionId: publishedVersion!.id, updatedAt: new Date() })
    .where(eq(flows.id, flowId))

  return publishedVersion!
}
