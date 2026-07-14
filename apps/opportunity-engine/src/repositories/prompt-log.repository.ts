import { prisma } from '../database/prisma.js'

export class PromptLogRepository {
  async create(input: {
    promptName: string
    promptHash: string
    input?: unknown
  }) {
    return prisma.promptLog.create({
      data: {
        promptName: input.promptName,
        promptHash: input.promptHash,
        input: input.input as object | undefined,
      },
    })
  }

  async updateSuccess(id: string, output: unknown, model: string, durationMs: number) {
    return prisma.promptLog.update({
      where: { id },
      data: { output: output as object, model, durationMs, success: true },
    })
  }

  async updateError(id: string, error: string) {
    return prisma.promptLog.update({
      where: { id },
      data: { success: false, error },
    })
  }
}
