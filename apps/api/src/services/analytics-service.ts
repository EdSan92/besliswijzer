import { and, eq, sql } from 'drizzle-orm'
import { analyticsEvents, leadSubmissions, type Database } from '@besliswijzer/db'
import type { AnalyticsSummary } from '@besliswijzer/flow-schema'

export async function ingestAnalyticsEvents(
  db: Database,
  events: Array<{
    flowId: string
    flowVersionId: string
    sessionId: string
    eventType: 'flow_start' | 'step_view' | 'step_complete' | 'flow_complete' | 'cta_click' | 'lead_submit'
    nodeKey?: string
    metadata?: Record<string, unknown>
  }>,
) {
  if (events.length === 0) return
  await db.insert(analyticsEvents).values(
    events.map((event) => ({
      flowId: event.flowId,
      flowVersionId: event.flowVersionId,
      sessionId: event.sessionId,
      eventType: event.eventType,
      nodeKey: event.nodeKey,
      metadata: event.metadata ?? {},
    })),
  )
}

export async function getAnalyticsSummary(db: Database, flowId: string): Promise<AnalyticsSummary> {
  const startsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.flowId, flowId), eq(analyticsEvents.eventType, 'flow_start')))

  const completionsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.flowId, flowId), eq(analyticsEvents.eventType, 'flow_complete')))

  const ctaResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.flowId, flowId), eq(analyticsEvents.eventType, 'cta_click')))

  const leadsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leadSubmissions)
    .where(eq(leadSubmissions.flowId, flowId))

  const starts = startsResult[0]?.count ?? 0
  const completions = completionsResult[0]?.count ?? 0

  const dropOffRows = await db.execute<{ node_key: string; views: number; completes: number }>(sql`
    SELECT
      sv.node_key,
      COUNT(DISTINCT sv.session_id)::int AS views,
      COUNT(DISTINCT sc.session_id)::int AS completes
    FROM analytics_events sv
    LEFT JOIN analytics_events sc
      ON sc.flow_id = sv.flow_id
      AND sc.session_id = sv.session_id
      AND sc.node_key = sv.node_key
      AND sc.event_type = 'step_complete'
    WHERE sv.flow_id = ${flowId}
      AND sv.event_type = 'step_view'
      AND sv.node_key IS NOT NULL
    GROUP BY sv.node_key
    ORDER BY views DESC
  `)

  const dropOffByNode = dropOffRows.map((row) => ({
    nodeKey: row.node_key,
    views: row.views,
    completes: row.completes,
    dropOffRate: row.views > 0 ? Math.round(((row.views - row.completes) / row.views) * 100) : 0,
  }))

  return {
    starts,
    completions,
    completionRate: starts > 0 ? Math.round((completions / starts) * 100) : 0,
    dropOffByNode,
    ctaClicks: ctaResult[0]?.count ?? 0,
    leadSubmissions: leadsResult[0]?.count ?? 0,
  }
}

export async function createLeadSubmission(
  db: Database,
  data: {
    flowId: string
    flowVersionId: string
    sessionId: string
    email: string
    answers: Record<string, unknown>
  },
) {
  const [submission] = await db
    .insert(leadSubmissions)
    .values({
      flowId: data.flowId,
      flowVersionId: data.flowVersionId,
      sessionId: data.sessionId,
      email: data.email,
      answersSnapshot: data.answers,
    })
    .returning()
  return submission
}

export async function exportLeadsCsv(db: Database, flowId: string): Promise<string> {
  const leads = await db.query.leadSubmissions.findMany({
    where: eq(leadSubmissions.flowId, flowId),
    orderBy: (l, { desc }) => [desc(l.createdAt)],
  })

  const header = 'email,session_id,created_at,answers\n'
  const rows = leads
    .map((lead) => {
      const answers = JSON.stringify(lead.answersSnapshot).replace(/"/g, '""')
      return `"${lead.email}","${lead.sessionId}","${lead.createdAt?.toISOString()}","${answers}"`
    })
    .join('\n')

  return header + rows
}
