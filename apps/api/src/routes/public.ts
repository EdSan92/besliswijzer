import type { FastifyInstance } from 'fastify'
import {
  analyticsBatchSchema,
  leadSubmissionSchema,
  stepRequestSchema,
} from '@besliswijzer/flow-schema'
import {
  calculateProgress,
  getEntryNode,
  getNodeByKey,
  getResultByKey,
  normalizeAnswer,
  resolveNext,
  validateAnswer,
} from '@besliswijzer/flow-engine'
import {
  getPublishedVersion,
  loadFlowSnapshot,
} from '../services/flow-service.js'
import {
  createLeadSubmission,
  ingestAnalyticsEvents,
} from '../services/analytics-service.js'
import {
  getCategoryWithFlows,
  listPopularPublishedFlows,
  listPublishedFlowsByCategory,
  listUncategorizedPublishedFlows,
  searchPublishedFlows,
} from '../services/category-service.js'

export async function registerPublicRoutes(app: FastifyInstance) {
  app.get('/api/v1/public/categories', async () => {
    const categories = await listPublishedFlowsByCategory(app.db)
    const uncategorized = await listUncategorizedPublishedFlows(app.db)
    return { categories, uncategorized }
  })

  app.get<{ Querystring: { limit?: string } }>('/api/v1/public/flows/popular', async (request) => {
    const parsed = Number(request.query.limit ?? 6)
    const limit = Math.min(Math.max(Number.isFinite(parsed) ? parsed : 6, 1), 12)
    const flows = await listPopularPublishedFlows(app.db, limit)
    return { flows }
  })

  app.get<{ Querystring: { q?: string; limit?: string } }>(
    '/api/v1/public/flows/search',
    async (request, reply) => {
      const query = (request.query.q ?? '').trim().slice(0, 100)
      if (query.length < 2) {
        return reply.status(400).send({ error: 'Query must be at least 2 characters' })
      }

      const parsed = Number(request.query.limit ?? 8)
      const limit = Math.min(Math.max(Number.isFinite(parsed) ? parsed : 8, 1), 20)
      const flows = await searchPublishedFlows(app.db, query, limit)
      return { flows, query }
    },
  )

  app.get<{ Params: { slug: string } }>('/api/v1/public/categories/:slug', async (request, reply) => {
    const category = await getCategoryWithFlows(app.db, request.params.slug)
    if (!category) return reply.status(404).send({ error: 'Category not found' })
    return category
  })

  app.get<{ Params: { slug: string }; Querystring: { v?: string } }>(
    '/api/v1/public/flows/:slug',
    async (request, reply) => {
      const versionNumber = request.query.v ? Number(request.query.v) : undefined
      const published = await getPublishedVersion(app.db, request.params.slug, versionNumber)

      if (!published) {
        return reply.status(404).send({ error: 'Flow not found' })
      }

      const snapshot = await loadFlowSnapshot(app.db, published.flow.id, published.version.id)
      if (!snapshot) {
        return reply.status(404).send({ error: 'Flow snapshot not found' })
      }

      const entryNode = getEntryNode(snapshot)
      if (!entryNode) {
        return reply.status(500).send({ error: 'Flow has no entry node' })
      }

      return {
        flowId: snapshot.flowId,
        versionId: snapshot.versionId,
        versionNumber: snapshot.versionNumber,
        slug: snapshot.slug,
        title: snapshot.title,
        seo: snapshot.seo,
        entryNode,
      }
    },
  )

  app.post<{ Params: { slug: string }; Querystring: { v?: string } }>(
    '/api/v1/public/flows/:slug/step',
    async (request, reply) => {
      const body = stepRequestSchema.parse(request.body)
      const versionNumber = request.query.v ? Number(request.query.v) : undefined
      const published = await getPublishedVersion(app.db, request.params.slug, versionNumber)

      if (!published) {
        return reply.status(404).send({ error: 'Flow not found' })
      }

      const snapshot = await loadFlowSnapshot(app.db, published.flow.id, published.version.id)
      if (!snapshot) {
        return reply.status(404).send({ error: 'Flow snapshot not found' })
      }

      const currentNode = getNodeByKey(snapshot, body.nodeKey)
      if (!currentNode) {
        return reply.status(400).send({ error: 'Invalid node key' })
      }

      if (!validateAnswer(currentNode, body.answer)) {
        return reply.status(400).send({ error: 'Invalid answer for node' })
      }

      const normalizedAnswer = normalizeAnswer(currentNode, body.answer)
      const answers = {
        ...(body.answers ?? {}),
        [body.nodeKey]: normalizedAnswer,
      }

      const next = resolveNext(snapshot, answers, body.nodeKey)
      const answeredKeys = Object.keys(answers)
      const progress = calculateProgress(snapshot, answeredKeys)

      if (next.type === 'node') {
        return {
          next: { type: 'node', nodeKey: next.nodeKey, node: next.node },
          progress,
        }
      }

      if (next.type === 'result') {
        return {
          next: {
            type: 'result',
            resultKey: next.resultKey,
            result: {
              resultKey: next.result.resultKey,
              title: next.result.title,
              body: next.result.body,
              ctas: next.result.ctas,
            },
          },
          progress: 100,
        }
      }

      return { next: { type: 'complete' }, progress: 100 }
    },
  )

  app.get<{ Params: { slug: string; resultKey: string }; Querystring: { v?: string } }>(
    '/api/v1/public/flows/:slug/results/:resultKey',
    async (request, reply) => {
      const versionNumber = request.query.v ? Number(request.query.v) : undefined
      const published = await getPublishedVersion(app.db, request.params.slug, versionNumber)

      if (!published) {
        return reply.status(404).send({ error: 'Flow not found' })
      }

      const snapshot = await loadFlowSnapshot(app.db, published.flow.id, published.version.id)
      if (!snapshot) {
        return reply.status(404).send({ error: 'Flow snapshot not found' })
      }

      const result = getResultByKey(snapshot, request.params.resultKey)
      if (!result) {
        return reply.status(404).send({ error: 'Result not found' })
      }

      return {
        flowId: snapshot.flowId,
        versionId: snapshot.versionId,
        result,
      }
    },
  )

  app.post('/api/v1/public/analytics/events', async (request, reply) => {
    const body = analyticsBatchSchema.parse(request.body)
    await ingestAnalyticsEvents(app.db, body.events)
    return reply.status(202).send({ accepted: body.events.length })
  })

  app.post<{ Params: { slug: string } }>(
    '/api/v1/public/flows/:slug/leads',
    async (request, reply) => {
      const body = leadSubmissionSchema.parse(request.body)

      if (body.honeypot) {
        return reply.status(202).send({ accepted: true })
      }

      const published = await getPublishedVersion(app.db, request.params.slug)
      if (!published) {
        return reply.status(404).send({ error: 'Flow not found' })
      }

      await createLeadSubmission(app.db, {
        flowId: published.flow.id,
        flowVersionId: published.version.id,
        sessionId: body.sessionId,
        email: body.email,
        answers: body.answers,
      })

      await ingestAnalyticsEvents(app.db, [
        {
          flowId: published.flow.id,
          flowVersionId: published.version.id,
          sessionId: body.sessionId,
          eventType: 'lead_submit',
          metadata: { emailDomain: body.email.split('@')[1] },
        },
      ])

      return reply.status(201).send({ accepted: true })
    },
  )
}
