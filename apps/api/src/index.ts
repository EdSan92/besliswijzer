import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { ZodError } from 'zod'
import { createDb } from '@besliswijzer/db'
import { registerPublicRoutes } from './routes/public.js'
import { registerAdminRoutes } from './routes/admin.js'
import { registerPreviewRoutes } from './routes/preview.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../.env') })

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://decision:decision@localhost:5432/besliswijzer'

const { db } = createDb(connectionString)

const app = Fastify({
  logger: true,
})

await app.register(cookie)

await app.register(cors, {
  origin: process.env.WEB_ORIGIN?.split(',').map((o) => o.trim()) ?? true,
  credentials: true,
})

app.decorate('db', db)
app.decorate('config', {
  adminApiKey: process.env.ADMIN_API_KEY ?? 'dev-admin-key',
  installSecret: process.env.INSTALL_SECRET ?? 'dev-install-secret',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
})

await app.register(async (publicApp) => {
  await publicApp.register(rateLimit, {
    max: process.env.CI === 'true' ? 1000 : 100,
    timeWindow: '1 minute',
  })
  await registerPublicRoutes(publicApp)
})

app.get('/health', async () => ({ status: 'ok' }))

function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError || (error as { name?: string }).name === 'ZodError'
}

app.setErrorHandler((error, _request, reply) => {
  if (isZodError(error)) {
    const zodError = error as ZodError
    return reply.status(400).send({
      error: 'Validation error',
      details: typeof zodError.flatten === 'function' ? zodError.flatten() : zodError.message,
    })
  }

  const statusCode = (error as { statusCode?: number }).statusCode
  if (statusCode === 429) {
    return reply.status(429).send({
      error: error instanceof Error ? error.message : 'Rate limit exceeded',
    })
  }

  const pgCode = (error as { code?: string }).code
  if (pgCode === '23505') {
    return reply.status(409).send({ error: 'Record already exists' })
  }
  if (pgCode === '42P01') {
    return reply.status(500).send({ error: 'Database schema missing — run migrations' })
  }

  app.log.error(error)
  return reply.status(500).send({ error: 'Internal server error' })
})

await registerAdminRoutes(app)
await registerPreviewRoutes(app)

const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001)
const host = process.env.API_HOST ?? '0.0.0.0'

try {
  await app.listen({ port, host })
  console.log(`API listening on http://${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof createDb>['db']
    config: {
      adminApiKey: string
      installSecret: string
      jwtSecret: string
    }
  }
}
