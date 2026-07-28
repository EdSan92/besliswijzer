import type { ContentPackageModelProvider, ContentPackageModelResponse } from '../types.js'

export class MockContentPackageModelProvider implements ContentPackageModelProvider {
  readonly provider: string
  readonly model: string
  readonly repairStructured?: ContentPackageModelProvider['repairStructured']
  private generateCalls = 0

  constructor(
    options: {
      provider?: string
      model?: string
      initialResponse: unknown
      repairResponse?: unknown
    },
  ) {
    this.provider = options.provider ?? 'mock'
    this.model = options.model ?? 'mock-model'
    this.initialResponse = options.initialResponse

    if (options.repairResponse !== undefined) {
      this.repairStructured = async () => ({ raw: options.repairResponse })
    }
  }

  private readonly initialResponse: unknown

  async generateStructured(_prompt: string): Promise<ContentPackageModelResponse> {
    this.generateCalls += 1
    return { raw: this.initialResponse }
  }

  getGenerateCalls(): number {
    return this.generateCalls
  }
}
