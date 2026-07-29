import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { DrizzlePipelineRunStore } from '@besliswijzer/db'
import {
  PipelineOrchestrator,
  createOrGetPipelineRun,
  type PipelineRunStatus,
} from '@besliswijzer/pipeline-schema'
import type { PipelineRunListStore } from '@besliswijzer/pipeline-review'
import {
  approvePipelineRun,
  approveRunBodySchema,
  getPipelineRunDetail,
  listPipelineRuns,
  rejectPipelineRun,
  rejectRunBodySchema,
  updateArtifactBodySchema,
  updatePipelineRunArtifact,
  PipelineReviewError,
} from '@besliswijzer/pipeline-review'
import {
  DEFAULT_PIPELINE_STEP_KEYS,
  PIPELINE_VERSION,
  createDefaultPipelineHandlers,
  createPipelineProviders,
  PipelineLiveConfigError,
} from '@besliswijzer/pipeline-steps'

const createRunBodySchema = z.object({
  categorySlug: z.string().min(1),
  language: z.string().min(2).default('nl'),
  inputVersion: z.string().min(1),
  primaryKeyword: z.string().min(1),
  categoryTitle: z.string().min(1).optional(),
})

const listQuerySchema = z.object({
  status: z
    .enum(['queued', 'running', 'needs_review', 'approved', 'failed', 'published'])
    .optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

function createPipelineStore(app: FastifyInstance): PipelineRunListStore {
  return new DrizzlePipelineRunStore(app.db)
}

function createOrchestrator(app: FastifyInstance) {
  const providers = createPipelineProviders({ env: process.env })
  const store = createPipelineStore(app)

  return {
    orchestrator: new PipelineOrchestrator({
      store,
      handlers: createDefaultPipelineHandlers({
        keywordProvider: providers.keywordProvider,
        flowBriefProvider: providers.flowBriefProvider,
        contentPackageProvider: providers.contentPackageProvider,
      }),
    }),
    providers,
  }
}

function handleReviewError(error: unknown, reply: FastifyReply) {
  if (error instanceof PipelineLiveConfigError) {
    return reply.status(503).send({ error: error.message, code: 'LIVE_CONFIG_INVALID', missing: error.missing })
  }

  if (error instanceof PipelineReviewError) {
    const status =
      error.code === 'NOT_FOUND' ? 404 : error.code === 'INVALID_STATUS' ? 409 : 400
    return reply.status(status).send({ error: error.message, code: error.code })
  }
  throw error
}

export async function registerPipelineAdminRoutes(app: FastifyInstance) {
  app.get('/api/v1/admin/pipeline-runs', async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.status(400).send({ error: 'Validation error', details: query.error.flatten() })
    }

    const store = createPipelineStore(app)
    const runs = await listPipelineRuns(store, {
      status: query.data.status as PipelineRunStatus | undefined,
      limit: query.data.limit,
    })
    return { runs }
  })

  app.get<{ Params: { id: string } }>('/api/v1/admin/pipeline-runs/:id', async (request, reply) => {
    try {
      const store = createPipelineStore(app)
      const detail = await getPipelineRunDetail(store, request.params.id)
      return detail
    } catch (error) {
      return handleReviewError(error, reply)
    }
  })

  app.post('/api/v1/admin/pipeline-runs', async (request, reply) => {
    const body = createRunBodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', details: body.error.flatten() })
    }

    const store = createPipelineStore(app)
    const { run, created } = await createOrGetPipelineRun(store, {
      categorySlug: body.data.categorySlug,
      language: body.data.language,
      pipelineVersion: PIPELINE_VERSION,
      inputVersion: body.data.inputVersion,
      stepKeys: [...DEFAULT_PIPELINE_STEP_KEYS],
    })

    if (run.status === 'queued' || (run.status === 'failed' && created)) {
      try {
        const { orchestrator } = createOrchestrator(app)
        const started = await orchestrator.start({
          runId: run.id,
          initialInput: {
            primaryKeyword: body.data.primaryKeyword,
            categoryTitle: body.data.categoryTitle ?? body.data.categorySlug,
          },
        })
        return reply.status(created ? 201 : 200).send({ run: started, created })
      } catch (error) {
        return handleReviewError(error, reply)
      }
    }

    return reply.status(200).send({ run, created })
  })

  app.patch<{ Params: { id: string } }>(
    '/api/v1/admin/pipeline-runs/:id/artifacts',
    async (request, reply) => {
      const body = updateArtifactBodySchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: 'Validation error', details: body.error.flatten() })
      }

      try {
        const store = createPipelineStore(app)
        const detail = await updatePipelineRunArtifact(store, request.params.id, body.data)
        return detail
      } catch (error) {
        return handleReviewError(error, reply)
      }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/pipeline-runs/:id/approve',
    async (request, reply) => {
      const body = approveRunBodySchema.safeParse(request.body ?? { actor: 'admin' })
      if (!body.success) {
        return reply.status(400).send({ error: 'Validation error', details: body.error.flatten() })
      }

      try {
        const store = createPipelineStore(app)
        const detail = await approvePipelineRun(store, request.params.id, body.data)
        return detail
      } catch (error) {
        return handleReviewError(error, reply)
      }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/pipeline-runs/:id/reject',
    async (request, reply) => {
      const body = rejectRunBodySchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: 'Validation error', details: body.error.flatten() })
      }

      try {
        const store = createPipelineStore(app)
        const detail = await rejectPipelineRun(store, request.params.id, body.data)
        return detail
      } catch (error) {
        return handleReviewError(error, reply)
      }
    },
  )
}
