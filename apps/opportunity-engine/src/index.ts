import cors from 'cors'
import express from 'express'
import { pinoHttp } from 'pino-http'
import type { IncomingMessage } from 'node:http'
import { createApiRouter } from './api/routes.js'
import { getConfig } from './config/index.js'
import { createContainer, formatError } from './container.js'
import { disconnectDatabase } from './database/prisma.js'
import { Scheduler } from './jobs/scheduler.js'
import { logger } from './utils/logger.js'

async function main() {
  const config = getConfig()
  const container = createContainer()
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '1mb' }))
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req: IncomingMessage) => req.url === '/health' },
    }),
  )

  app.use('/api', createApiRouter(container.opportunityController, container.statisticsController))

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const { status, message } = formatError(error)
    logger.error({ error, status }, 'Request failed')
    res.status(status).json({ error: message })
  })

  const scheduler = new Scheduler(container.discoveryService)
  scheduler.start()

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, aiProvider: config.AI_PROVIDER }, 'Opportunity Engine started')
  })

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down')
    scheduler.stop()
    server.close()
    await disconnectDatabase()
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start Opportunity Engine')
  process.exit(1)
})
