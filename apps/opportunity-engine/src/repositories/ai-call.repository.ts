import { prisma } from '../database/prisma.js'

export class AiCallRepository {
  async create(input: {
    provider: string
    model: string
    operation: string
    promptLogId?: string
    inputTokens?: number
    outputTokens?: number
    latencyMs: number
    retryCount: number
    success: boolean
    error?: string
  }) {
    return prisma.aiCall.create({ data: input })
  }

  async getStats(since: Date) {
    const [total, success, avgLatency, totalTokens] = await Promise.all([
      prisma.aiCall.count({ where: { createdAt: { gte: since } } }),
      prisma.aiCall.count({ where: { createdAt: { gte: since }, success: true } }),
      prisma.aiCall.aggregate({
        where: { createdAt: { gte: since } },
        _avg: { latencyMs: true },
      }),
      prisma.aiCall.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { inputTokens: true, outputTokens: true },
      }),
    ])

    return {
      total,
      success,
      failed: total - success,
      avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
      inputTokens: totalTokens._sum.inputTokens ?? 0,
      outputTokens: totalTokens._sum.outputTokens ?? 0,
    }
  }
}
