import type { Request, Response } from 'express'
import type { StatisticsService } from '../../services/statistics.service.js'

export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  get = async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.statisticsService.getStatistics()
    res.json(stats)
  }
}
