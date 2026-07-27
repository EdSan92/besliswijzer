import { and, eq, inArray, sql } from 'drizzle-orm'
import { analyticsEvents, leadSubmissions, type Database } from '@besliswijzer/db'
import type { AnalyticsSummary, BetaAnalyticsReport } from '@besliswijzer/flow-schema'

type IngestEvent = {
  flowId?: string
  flowVersionId?: string
  sessionId: string
  eventType:
    | 'page_view'
    | 'flow_start'
    | 'step_view'
    | 'step_complete'
    | 'flow_complete'
    | 'cta_click'
    | 'affiliate_click'
    | 'lead_submit'
  nodeKey?: string
  metadata?: Record<string, unknown>
}

type BetaAnalyticsEventRow = {
  eventType: string
  categorySlug?: string | null
  categoryTitle?: string | null
  productSlug?: string | null
  flowSlug?: string | null
  trackingId?: string | null
  productPosition?: number | null
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0
}

export function buildBetaAnalyticsReport(events: BetaAnalyticsEventRow[]): BetaAnalyticsReport {
  const totals = {
    pageViews: 0,
    flowStarts: 0,
    flowCompletions: 0,
    affiliateClicks: 0,
    completionRate: 0,
    clickThroughRate: 0,
  }

  const categoryMap = new Map<
    string,
    {
      categorySlug: string
      categoryTitle: string
      pageViews: number
      flowStarts: number
      flowCompletions: number
      affiliateClicks: number
    }
  >()

  const productMap = new Map<
    string,
    { trackingId: string; affiliateClicks: number; productPosition: number | null }
  >()

  for (const event of events) {
    const categorySlug = event.categorySlug ?? 'uncategorized'
    const categoryTitle = event.categoryTitle ?? 'Ongecategoriseerd'
    const category =
      categoryMap.get(categorySlug) ??
      (() => {
        const row = {
          categorySlug,
          categoryTitle,
          pageViews: 0,
          flowStarts: 0,
          flowCompletions: 0,
          affiliateClicks: 0,
        }
        categoryMap.set(categorySlug, row)
        return row
      })()

    switch (event.eventType) {
      case 'page_view':
        totals.pageViews += 1
        category.pageViews += 1
        break
      case 'flow_start':
        totals.flowStarts += 1
        category.flowStarts += 1
        break
      case 'flow_complete':
        totals.flowCompletions += 1
        category.flowCompletions += 1
        break
      case 'affiliate_click':
      case 'cta_click':
        totals.affiliateClicks += 1
        category.affiliateClicks += 1
        if (event.trackingId) {
          const product =
            productMap.get(event.trackingId) ??
            (() => {
              const row = {
                trackingId: event.trackingId as string,
                affiliateClicks: 0,
                productPosition: event.productPosition ?? null,
              }
              productMap.set(event.trackingId as string, row)
              return row
            })()
          product.affiliateClicks += 1
        }
        break
      default:
        break
    }
  }

  totals.completionRate = rate(totals.flowCompletions, totals.flowStarts)
  totals.clickThroughRate = rate(totals.affiliateClicks, totals.flowCompletions)

  const byCategory = [...categoryMap.values()]
    .map((row) => ({
      ...row,
      completionRate: rate(row.flowCompletions, row.flowStarts),
      clickThroughRate: rate(row.affiliateClicks, row.flowCompletions),
    }))
    .sort((a, b) => b.pageViews - a.pageViews)

  const byProduct = [...productMap.values()].sort((a, b) => b.affiliateClicks - a.affiliateClicks)

  return { totals, byCategory, byProduct }
}

export async function ingestAnalyticsEvents(db: Database, events: IngestEvent[]) {
  if (events.length === 0) return
  await db.insert(analyticsEvents).values(
    events.map((event) => ({
      flowId: event.flowId ?? null,
      flowVersionId: event.flowVersionId ?? null,
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
    .where(
      and(
        eq(analyticsEvents.flowId, flowId),
        inArray(analyticsEvents.eventType, ['cta_click', 'affiliate_click']),
      ),
    )

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

export async function getBetaAnalyticsReport(db: Database): Promise<BetaAnalyticsReport> {
  const rows = await db.execute<{
    event_type: string
    category_slug: string | null
    category_title: string | null
    page_slug: string | null
    flow_slug: string | null
    tracking_id: string | null
    product_position: number | null
  }>(sql`
    SELECT
      ae.event_type,
      fc.slug AS category_slug,
      fc.title AS category_title,
      ae.metadata->>'pageSlug' AS page_slug,
      COALESCE(ae.metadata->>'flowSlug', f.slug) AS flow_slug,
      ae.metadata->>'trackingId' AS tracking_id,
      NULLIF(ae.metadata->>'productPosition', '')::int AS product_position
    FROM analytics_events ae
    LEFT JOIN flows f ON f.id = ae.flow_id
    LEFT JOIN flow_categories fc ON fc.id = f.category_id
    WHERE ae.event_type IN ('page_view', 'flow_start', 'flow_complete', 'affiliate_click', 'cta_click')
  `)

  return buildBetaAnalyticsReport(
    rows.map((row) => ({
      eventType: row.event_type,
      categorySlug: row.category_slug,
      categoryTitle: row.category_title,
      productSlug: row.page_slug,
      flowSlug: row.flow_slug,
      trackingId: row.tracking_id,
      productPosition: row.product_position,
    })),
  )
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
