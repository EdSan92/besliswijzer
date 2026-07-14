import cron from 'node-cron'
import { getConfig } from '../config/index.js'
import type { DiscoveryService } from '../services/discovery.service.js'
import { logger } from '../utils/logger.js'

export class Scheduler {
  private task: cron.ScheduledTask | null = null

  constructor(private readonly discoveryService: DiscoveryService) {}

  start(): void {
    const config = getConfig()
    if (!config.CRON_ENABLED) {
      logger.info('Cron scheduler disabled')
      return
    }

    this.task = cron.schedule(config.CRON_DISCOVERY_SCHEDULE, async () => {
      logger.info('Nightly discovery job started')
      try {
        const result = await this.discoveryService.discover()
        logger.info(result, 'Nightly discovery job completed')
      } catch (error) {
        logger.error({ error }, 'Nightly discovery job failed')
      }
    })

    logger.info({ schedule: config.CRON_DISCOVERY_SCHEDULE }, 'Cron scheduler started')
  }

  stop(): void {
    this.task?.stop()
    this.task = null
  }
}
