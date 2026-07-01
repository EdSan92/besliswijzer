import type { FastifyInstance } from 'fastify'
import { stepRequestSchema } from '@besliswijzer/flow-schema'
import {
  calculateProgress,
  getNodeByKey,
  normalizeAnswer,
  resolveNext,
  validateAnswer,
} from '@besliswijzer/flow-engine'
import { getDraftVersion, loadFlowSnapshot } from '../services/flow-service.js'

export async function registerPreviewRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/flows/:id/preview/step',
    async (request, reply) => {
      const body = stepRequestSchema.parse(request.body)
      const draft = await getDraftVersion(app.db, request.params.id)
      if (!draft) return reply.status(404).send({ error: 'Draft not found' })

      const snapshot = await loadFlowSnapshot(app.db, request.params.id, draft.id)
      if (!snapshot) return reply.status(404).send({ error: 'Snapshot not found' })

      const currentNode = getNodeByKey(snapshot, body.nodeKey)
      if (!currentNode) return reply.status(400).send({ error: 'Invalid node key' })

      if (!validateAnswer(currentNode, body.answer)) {
        return reply.status(400).send({ error: 'Invalid answer for node' })
      }

      const normalizedAnswer = normalizeAnswer(currentNode, body.answer)
      const answers = { ...(body.answers ?? {}), [body.nodeKey]: normalizedAnswer }
      const next = resolveNext(snapshot, answers, body.nodeKey)
      const progress = calculateProgress(snapshot, Object.keys(answers))

      if (next.type === 'node') {
        return { next: { type: 'node', nodeKey: next.nodeKey, node: next.node }, progress }
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
}
