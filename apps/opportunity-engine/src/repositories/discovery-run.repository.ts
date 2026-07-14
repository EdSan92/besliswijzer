import { prisma } from '../database/prisma.js'

export class DiscoveryRunRepository {
  async create(input: {
    seedCategories: number
    keywordsCollected: number
    opportunitiesFound: number
    opportunitiesStored: number
    durationMs: number
    errors?: string[]
  }) {
    return prisma.discoveryRun.create({
      data: {
        seedCategories: input.seedCategories,
        keywordsCollected: input.keywordsCollected,
        opportunitiesFound: input.opportunitiesFound,
        opportunitiesStored: input.opportunitiesStored,
        durationMs: input.durationMs,
        errors: input.errors?.length ? input.errors : undefined,
      },
    })
  }

  async getLatest(limit = 10) {
    return prisma.discoveryRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
}
