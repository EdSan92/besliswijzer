import type { AiCallRepository } from '../repositories/ai-call.repository.js'
import type { DiscoveryRunRepository } from '../repositories/discovery-run.repository.js'
import type { OpportunityRepository } from '../repositories/opportunity.repository.js'

export class StatisticsService {
  constructor(
    private readonly opportunityRepo: OpportunityRepository,
    private readonly aiCallRepo: AiCallRepository,
    private readonly discoveryRunRepo: DiscoveryRunRepository,
  ) {}

  async getStatistics() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [byStatus, aiStats, recentRuns] = await Promise.all([
      this.opportunityRepo.countByStatus(),
      this.aiCallRepo.getStats(since),
      this.discoveryRunRepo.getLatest(5),
    ])

    return {
      opportunities: byStatus,
      ai: aiStats,
      recentDiscoveryRuns: recentRuns,
    }
  }
}
