import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { and, eq } from 'drizzle-orm'
import { SignJWT } from 'jose'
import { z } from 'zod'
import {
  flowNodes,
  flowOptions,
  flowResults,
  flowRules,
  flowCategories,
  flows,
  products,
} from '@besliswijzer/db'
import {
  flowNodeSchema,
  flowOptionSchema,
  flowResultSchema,
  flowRuleSchema,
  flowImportRequestSchema,
  flowDefinitionSchema,
  seoMetaSchema,
} from '@besliswijzer/flow-schema'
import { contentBlockSchema, type ContentBlock } from '@besliswijzer/product-schema'
import {
  ensureDraftVersion,
  getDraftVersion,
  loadFlowSnapshot,
} from '../services/flow-service.js'
import { publishFlow } from '../services/publish-service.js'
import {
  exportFlowDefinition,
  FlowImportError,
  importFlowDefinition,
} from '../services/flow-import-export-service.js'
import {
  exportLeadsCsv,
  getAnalyticsSummary,
  getBetaAnalyticsReport,
} from '../services/analytics-service.js'
import {
  appendFaqToProductPage,
  matchProductForOpportunity,
} from '../services/product-router-service.js'
import {
  createProductPage,
  generateProductPageForProductSlug,
  getAdminProductPage,
  listAdminProductPages,
  listAdminProducts,
  publishProductPage,
  regenerateProductPageViaOpportunity,
  unpublishProductPage,
  updateProductPage,
  syncProductKeywords,
  type UpdateProductPageInput,
} from '../services/product-page-service.js'
import { isArchivedFlow } from '../services/flow-admin-service.js'

async function verifyAdminKey(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const key = request.headers['x-admin-key']
  if (key !== request.server.config.adminApiKey) {
    await reply.code(401).send({ error: 'Unauthorized' })
    return false
  }
  return true
}

function parseAdminBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
  reply: FastifyReply,
): T | null {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() })
    return null
  }
  return parsed.data
}

async function createAdminToken(jwtSecret: string) {
  const key = new TextEncoder().encode(jwtSecret)
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(key)
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.post<{ Querystring: { token?: string } }>(
    '/api/v1/admin/setup',
    async (request, reply) => {
      if (request.query.token !== app.config.installSecret) {
        return reply.status(401).send({ error: 'Invalid install token' })
      }

      const token = await createAdminToken(app.config.jwtSecret)
      reply.setCookie('admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      })

      return { ok: true }
    },
  )

  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/api/v1/admin') || request.url.includes('/setup')) {
      return
    }
    const authorized = await verifyAdminKey(request, reply)
    if (!authorized) return
  })

  app.get('/api/v1/admin/flows', async () => {
    const allFlows = await app.db.query.flows.findMany({
      with: { currentPublishedVersion: true, category: true },
      orderBy: (f, { desc }) => [desc(f.createdAt)],
    })

    return allFlows.map((flow) => ({
      id: flow.id,
      slug: flow.slug,
      title: flow.title,
      categoryId: flow.categoryId,
      category: flow.category
        ? { id: flow.category.id, slug: flow.category.slug, title: flow.category.title }
        : null,
      seo: flow.seoMeta,
      currentPublishedVersionId: flow.currentPublishedVersionId,
      publishedVersionNumber: flow.currentPublishedVersion?.versionNumber ?? null,
      archived: isArchivedFlow(flow),
      createdAt: flow.createdAt,
    }))
  })

  app.get('/api/v1/admin/categories', async () => {
    return app.db.query.flowCategories.findMany({
      orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.title)],
      with: { flows: true },
    })
  })

  app.get<{ Querystring: { keyword?: string; category?: string } }>(
    '/api/v1/admin/products/match',
    async (request, reply) => {
      const keyword = (request.query.keyword ?? '').trim()
      if (keyword.length < 2) {
        return reply.status(400).send({ error: 'keyword is required' })
      }

      try {
        const match = await matchProductForOpportunity(
          app.db,
          keyword,
          request.query.category?.trim(),
        )
        return { match: match ?? null }
      } catch (error) {
        request.log.error({ error, keyword }, 'Product match query failed')
        const message = error instanceof Error ? error.message : 'Product match failed'
        return reply.status(500).send({ error: message, keyword })
      }
    },
  )

  app.get('/api/v1/admin/product-pages', async () => {
    const pages = await listAdminProductPages(app.db)
    return { pages }
  })

  app.get('/api/v1/admin/products', async () => {
    const products = await listAdminProducts(app.db)
    return { products }
  })

  app.post<{ Params: { slug: string } }>(
    '/api/v1/admin/products/:slug/generate-page',
    async (request, reply) => {
      const opportunityApiBase = process.env.OPPORTUNITY_API_BASE
      if (!opportunityApiBase) {
        return reply.status(500).send({ error: 'OPPORTUNITY_API_BASE is not configured' })
      }

      try {
        const result = await generateProductPageForProductSlug(
          app.db,
          request.params.slug,
          opportunityApiBase,
        )
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generate failed'
        const status = message.includes('al een productpagina') ? 409 : 400
        return reply.status(status).send({ error: message })
      }
    },
  )

  app.get<{ Params: { slug: string } }>(
    '/api/v1/admin/product-pages/:slug',
    async (request, reply) => {
      const page = await getAdminProductPage(app.db, request.params.slug)
      if (!page) {
        return reply.status(404).send({ error: 'Product page not found' })
      }
      return page
    },
  )

  app.post<{ Params: { slug: string } }>(
    '/api/v1/admin/product-pages/:slug/publish',
    async (request, reply) => {
      try {
        const result = await publishProductPage(app.db, request.params.slug)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Publish failed'
        return reply.status(400).send({ error: message })
      }
    },
  )

  app.post<{ Params: { slug: string } }>(
    '/api/v1/admin/product-pages/:slug/unpublish',
    async (request, reply) => {
      try {
        const result = await unpublishProductPage(app.db, request.params.slug)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unpublish failed'
        return reply.status(400).send({ error: message })
      }
    },
  )

  app.put<{ Params: { slug: string } }>(
    '/api/v1/admin/products/:slug/keywords',
    async (request, reply) => {
      const body = z
        .object({
          productId: z.string().uuid(),
          keywords: z.array(
            z.object({
              term: z.string().min(1),
              opportunityId: z.string().optional(),
              score: z.number().optional(),
            }),
          ),
        })
        .parse(request.body)

      const product = await app.db.query.products.findFirst({
        where: eq(products.slug, request.params.slug),
        columns: { id: true },
      })

      if (!product || product.id !== body.productId) {
        return reply.status(404).send({ error: 'Product not found' })
      }

      const synced = await syncProductKeywords(
        app.db,
        product.id,
        body.keywords.map((keyword) => ({
          term: keyword.term,
          opportunityId: keyword.opportunityId ?? null,
        })),
      )

      return { synced }
    },
  )

  app.post<{ Params: { slug: string } }>(
    '/api/v1/admin/product-pages/:slug/regenerate',
    async (request, reply) => {
      const opportunityApiBase = process.env.OPPORTUNITY_API_BASE
      if (!opportunityApiBase) {
        return reply.status(500).send({ error: 'OPPORTUNITY_API_BASE is not configured' })
      }

      try {
        const result = await regenerateProductPageViaOpportunity(
          app.db,
          request.params.slug,
          opportunityApiBase,
        )
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Regenerate failed'
        return reply.status(400).send({ error: message })
      }
    },
  )

  app.patch<{ Params: { slug: string } }>(
    '/api/v1/admin/product-pages/:slug',
    async (request, reply) => {
      const body = parseAdminBody(
        z.object({
          page: z.object({
            title: z.string().min(1).optional(),
            seoMeta: z
              .object({
                title: z.string().min(1),
                description: z.string().min(1),
                twitterCard: z.enum(['summary', 'summary_large_image']).optional(),
              })
              .optional(),
            layout: z.object({ blockOrder: z.array(z.string()) }).optional(),
            blocks: z.array(contentBlockSchema).optional(),
          }),
        }),
        request.body,
        reply,
      )
      if (!body) return

      try {
        const pageInput: UpdateProductPageInput = {
          ...(body.page.title !== undefined ? { title: body.page.title } : {}),
          ...(body.page.seoMeta !== undefined ? { seoMeta: body.page.seoMeta } : {}),
          ...(body.page.layout !== undefined ? { layout: body.page.layout } : {}),
          ...(body.page.blocks !== undefined
            ? {
                blocks: body.page.blocks.map((block) =>
                  contentBlockSchema.parse(block),
                ) as ContentBlock[],
              }
            : {}),
        }
        const result = await updateProductPage(app.db, request.params.slug, pageInput)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Update failed'
        return reply.status(400).send({ error: message })
      }
    },
  )

  app.post<{ Params: { slug: string } }>(
    '/api/v1/admin/product-pages/:slug/faq-items',
    async (request, reply) => {
      const body = z
        .object({
          opportunityId: z.string().min(1),
          keywordTerm: z.string().min(1),
          question: z.string().min(5),
          answer: z.string().min(20),
        })
        .parse(request.body)

      try {
        const result = await appendFaqToProductPage(app.db, request.params.slug, body)
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to append FAQ'
        return reply.status(400).send({ error: message })
      }
    },
  )

  app.post('/api/v1/admin/product-pages', async (request, reply) => {
    const body = parseAdminBody(
      z.object({
        product: z.object({
          slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
          title: z.string().min(1),
          canonicalName: z.string().min(1),
          categoryId: z.string().uuid().nullable().optional(),
          primaryFlowId: z.string().uuid(),
        }),
        page: z.object({
          slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
          title: z.string().min(1),
          seoMeta: z.object({
            title: z.string().min(1),
            description: z.string().min(1),
            twitterCard: z.enum(['summary', 'summary_large_image']).optional(),
          }),
          layout: z.object({
            blockOrder: z.array(z.string()),
          }),
          blocks: z.array(contentBlockSchema),
          status: z.enum(['draft', 'published']).default('draft'),
        }),
      }),
      request.body,
      reply,
    )
    if (!body) return

    try {
      const result = await createProductPage(app.db, {
        product: body.product,
        page: {
          ...body.page,
          blocks: body.page.blocks.map((block) => contentBlockSchema.parse(block)) as ContentBlock[],
        },
      })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create product page'
      const status = message.includes('already exists') ? 409 : 400
      return reply.status(status).send({ error: message })
    }
  })

  app.post('/api/v1/admin/categories', async (request) => {
    const body = z
      .object({
        slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
        title: z.string().min(1),
        description: z.string().optional(),
        sortOrder: z.number().int().default(0),
      })
      .parse(request.body)

    const [category] = await app.db.insert(flowCategories).values(body).returning()
    return category
  })

  app.patch<{ Params: { id: string } }>('/api/v1/admin/categories/:id', async (request, reply) => {
    const body = z
      .object({
        slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(request.body)

    const [updated] = await app.db
      .update(flowCategories)
      .set(body)
      .where(eq(flowCategories.id, request.params.id))
      .returning()

    if (!updated) return reply.status(404).send({ error: 'Category not found' })
    return updated
  })

  app.delete<{ Params: { id: string } }>('/api/v1/admin/categories/:id', async (request, reply) => {
    await app.db.delete(flowCategories).where(eq(flowCategories.id, request.params.id))
    return reply.status(204).send()
  })

  app.post('/api/v1/admin/flows/import', async (request, reply) => {
    try {
      const body = flowImportRequestSchema.parse(request.body)
      const result = await importFlowDefinition(app.db, body)
      return result
    } catch (error) {
      if (error instanceof FlowImportError) {
        return reply.status(error.statusCode).send({ error: error.message })
      }
      throw error
    }
  })

  app.post('/api/v1/admin/flows', async (request) => {
    const body = z
      .object({
        slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
        title: z.string().min(1),
        categoryId: z.string().uuid().nullable().optional(),
        seo: seoMetaSchema.optional(),
      })
      .parse(request.body)

    const [flow] = await app.db
      .insert(flows)
      .values({
        slug: body.slug,
        title: body.title,
        categoryId: body.categoryId ?? null,
        seoMeta: body.seo ?? { title: body.title, description: body.title },
      })
      .returning()

    await ensureDraftVersion(app.db, flow!.id)

    return flow
  })

  app.get<{ Params: { id: string } }>('/api/v1/admin/flows/:id', async (request, reply) => {
    const flow = await app.db.query.flows.findFirst({
      where: eq(flows.id, request.params.id),
      with: { currentPublishedVersion: true, category: true },
    })
    if (!flow) return reply.status(404).send({ error: 'Flow not found' })

    const draft = await getDraftVersion(app.db, flow.id)
    return { ...flow, draftVersionId: draft?.id ?? null }
  })

  app.patch<{ Params: { id: string } }>('/api/v1/admin/flows/:id', async (request, reply) => {
    const body = z
      .object({
        title: z.string().min(1).optional(),
        slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
        categoryId: z.string().uuid().nullable().optional(),
        seo: seoMetaSchema.optional(),
      })
      .parse(request.body)

    const [updated] = await app.db
      .update(flows)
      .set({
        ...(body.title && { title: body.title }),
        ...(body.slug && { slug: body.slug }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.seo && { seoMeta: body.seo }),
        updatedAt: new Date(),
      })
      .where(eq(flows.id, request.params.id))
      .returning()

    if (!updated) return reply.status(404).send({ error: 'Flow not found' })
    return updated
  })

  app.delete<{ Params: { id: string } }>('/api/v1/admin/flows/:id', async (request, reply) => {
    const [deleted] = await app.db
      .delete(flows)
      .where(eq(flows.id, request.params.id))
      .returning({ id: flows.id })

    if (!deleted) return reply.status(404).send({ error: 'Flow not found' })
    return reply.status(204).send()
  })

  app.get<{ Params: { id: string } }>('/api/v1/admin/flows/:id/export', async (request, reply) => {
    try {
      const definition = await exportFlowDefinition(app.db, request.params.id)
      reply.header('Content-Disposition', `attachment; filename="${definition.slug}.json"`)
      return definition
    } catch (error) {
      if (error instanceof FlowImportError) {
        return reply.status(error.statusCode).send({ error: error.message })
      }
      throw error
    }
  })

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/flows/:id/import',
    async (request, reply) => {
      try {
        const body = z
          .object({
            publish: z.boolean().default(false),
            flow: flowDefinitionSchema,
          })
          .parse(request.body)

        const existing = await app.db.query.flows.findFirst({
          where: eq(flows.id, request.params.id),
        })
        if (!existing) return reply.status(404).send({ error: 'Flow not found' })

        const result = await importFlowDefinition(app.db, {
          publish: body.publish,
          overwrite: true,
          flow: { ...body.flow, slug: existing.slug },
        })
        return result
      } catch (error) {
        if (error instanceof FlowImportError) {
          return reply.status(error.statusCode).send({ error: error.message })
        }
        throw error
      }
    },
  )

  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/flows/:id/preview',
    async (request, reply) => {
      const draft = await getDraftVersion(app.db, request.params.id)
      if (!draft) return reply.status(404).send({ error: 'Draft not found' })

      const snapshot = await loadFlowSnapshot(app.db, request.params.id, draft.id)
      if (!snapshot) return reply.status(404).send({ error: 'Snapshot not found' })

      return snapshot
    },
  )

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/flows/:id/publish',
    async (request, reply) => {
      try {
        const version = await publishFlow(app.db, request.params.id)
        return { versionId: version.id, versionNumber: version.versionNumber }
      } catch (err) {
        return reply.status(400).send({ error: (err as Error).message })
      }
    },
  )

  // Nodes CRUD
  app.get<{ Params: { id: string } }>('/api/v1/admin/flows/:id/nodes', async (request, reply) => {
    const draft = await getDraftVersion(app.db, request.params.id)
    if (!draft) return reply.status(404).send({ error: 'Draft not found' })

    const nodes = await app.db.query.flowNodes.findMany({
      where: eq(flowNodes.flowVersionId, draft.id),
      with: { options: true },
      orderBy: (n, { asc }) => [asc(n.sortOrder)],
    })
    return nodes
  })

  app.post<{ Params: { id: string } }>('/api/v1/admin/flows/:id/nodes', async (request, reply) => {
    const draft = await getDraftVersion(app.db, request.params.id)
    if (!draft) return reply.status(404).send({ error: 'Draft not found' })

    const body = flowNodeSchema.omit({ options: true }).parse(request.body)
    const [node] = await app.db
      .insert(flowNodes)
      .values({
        flowVersionId: draft.id,
        nodeKey: body.nodeKey,
        type: body.type,
        title: body.title,
        content: body.content,
        sortOrder: body.sortOrder,
        isEntry: body.isEntry,
      })
      .returning()

    return node
  })

  app.patch<{ Params: { id: string; nodeId: string } }>(
    '/api/v1/admin/flows/:id/nodes/:nodeId',
    async (request, reply) => {
      const draft = await getDraftVersion(app.db, request.params.id)
      if (!draft) return reply.status(404).send({ error: 'Draft not found' })

      const body = flowNodeSchema.partial().omit({ options: true }).parse(request.body)
      const [updated] = await app.db
        .update(flowNodes)
        .set({
          ...(body.nodeKey && { nodeKey: body.nodeKey }),
          ...(body.type && { type: body.type }),
          ...(body.title && { title: body.title }),
          ...(body.content && { content: body.content }),
          ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
          ...(body.isEntry !== undefined && { isEntry: body.isEntry }),
        })
        .where(and(eq(flowNodes.id, request.params.nodeId), eq(flowNodes.flowVersionId, draft.id)))
        .returning()

      if (!updated) return reply.status(404).send({ error: 'Node not found' })
      return updated
    },
  )

  app.delete<{ Params: { id: string; nodeId: string } }>(
    '/api/v1/admin/flows/:id/nodes/:nodeId',
    async (request, reply) => {
      const draft = await getDraftVersion(app.db, request.params.id)
      if (!draft) return reply.status(404).send({ error: 'Draft not found' })

      await app.db
        .delete(flowNodes)
        .where(and(eq(flowNodes.id, request.params.nodeId), eq(flowNodes.flowVersionId, draft.id)))

      return reply.status(204).send()
    },
  )

  // Options CRUD
  app.post<{ Params: { id: string; nodeId: string } }>(
    '/api/v1/admin/flows/:id/nodes/:nodeId/options',
    async (request, reply) => {
      const draft = await getDraftVersion(app.db, request.params.id)
      if (!draft) return reply.status(404).send({ error: 'Draft not found' })

      const node = await app.db.query.flowNodes.findFirst({
        where: and(eq(flowNodes.id, request.params.nodeId), eq(flowNodes.flowVersionId, draft.id)),
      })
      if (!node) return reply.status(404).send({ error: 'Node not found' })

      const body = flowOptionSchema.parse(request.body)
      const [option] = await app.db
        .insert(flowOptions)
        .values({
          nodeId: node.id,
          optionKey: body.optionKey,
          label: body.label,
          value: body.value,
          sortOrder: body.sortOrder,
        })
        .returning()

      return option
    },
  )

  app.delete<{ Params: { id: string; optionId: string } }>(
    '/api/v1/admin/flows/:id/options/:optionId',
    async (request) => {
      await app.db.delete(flowOptions).where(eq(flowOptions.id, request.params.optionId))
      return { ok: true }
    },
  )

  // Rules CRUD
  app.get<{ Params: { id: string } }>('/api/v1/admin/flows/:id/rules', async (request, reply) => {
    const draft = await getDraftVersion(app.db, request.params.id)
    if (!draft) return reply.status(404).send({ error: 'Draft not found' })

    return app.db.query.flowRules.findMany({
      where: eq(flowRules.flowVersionId, draft.id),
      orderBy: (r, { desc }) => [desc(r.priority)],
    })
  })

  app.post<{ Params: { id: string } }>('/api/v1/admin/flows/:id/rules', async (request, reply) => {
    const draft = await getDraftVersion(app.db, request.params.id)
    if (!draft) return reply.status(404).send({ error: 'Draft not found' })

    const body = flowRuleSchema.parse(request.body)
    const [rule] = await app.db
      .insert(flowRules)
      .values({
        flowVersionId: draft.id,
        fromNodeKey: body.fromNodeKey,
        ruleType: body.ruleType,
        condition: body.condition,
        targetNodeKey: body.targetNodeKey,
        targetResultKey: body.targetResultKey,
        priority: body.priority,
      })
      .returning()

    return rule
  })

  app.delete<{ Params: { id: string; ruleId: string } }>(
    '/api/v1/admin/flows/:id/rules/:ruleId',
    async (request) => {
      await app.db.delete(flowRules).where(eq(flowRules.id, request.params.ruleId))
      return { ok: true }
    },
  )

  // Results CRUD
  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/flows/:id/results',
    async (request, reply) => {
      const draft = await getDraftVersion(app.db, request.params.id)
      if (!draft) return reply.status(404).send({ error: 'Draft not found' })

      return app.db.query.flowResults.findMany({
        where: eq(flowResults.flowVersionId, draft.id),
      })
    },
  )

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/flows/:id/results',
    async (request, reply) => {
      const draft = await getDraftVersion(app.db, request.params.id)
      if (!draft) return reply.status(404).send({ error: 'Draft not found' })

      const body = flowResultSchema.parse(request.body)
      const [result] = await app.db
        .insert(flowResults)
        .values({
          flowVersionId: draft.id,
          resultKey: body.resultKey,
          title: body.title,
          body: body.body,
          ctas: body.ctas,
        })
        .returning()

      return result
    },
  )

  app.patch<{ Params: { id: string; resultId: string } }>(
    '/api/v1/admin/flows/:id/results/:resultId',
    async (request, reply) => {
      const draft = await getDraftVersion(app.db, request.params.id)
      if (!draft) return reply.status(404).send({ error: 'Draft not found' })

      const body = flowResultSchema.partial().parse(request.body)
      const [updated] = await app.db
        .update(flowResults)
        .set({
          ...(body.resultKey && { resultKey: body.resultKey }),
          ...(body.title && { title: body.title }),
          ...(body.body && { body: body.body }),
          ...(body.ctas && { ctas: body.ctas }),
        })
        .where(
          and(eq(flowResults.id, request.params.resultId), eq(flowResults.flowVersionId, draft.id)),
        )
        .returning()

      if (!updated) return reply.status(404).send({ error: 'Result not found' })
      return updated
    },
  )

  app.get('/api/v1/admin/analytics/beta-report', async () => {
    return getBetaAnalyticsReport(app.db)
  })

  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/flows/:id/analytics',
    async (request) => {
      return getAnalyticsSummary(app.db, request.params.id)
    },
  )

  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/flows/:id/leads',
    async (request, reply) => {
      const csv = await exportLeadsCsv(app.db, request.params.id)
      reply.header('Content-Type', 'text/csv')
      reply.header('Content-Disposition', `attachment; filename="leads-${request.params.id}.csv"`)
      return csv
    },
  )
}
