import type { FlowBriefModelProvider, FlowBriefModelResponse } from '../types.js'

export class MockFlowBriefModelProvider implements FlowBriefModelProvider {
  readonly provider: string
  readonly model: string
  readonly repairStructured?: FlowBriefModelProvider['repairStructured']
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

  async generateStructured(_prompt: string): Promise<FlowBriefModelResponse> {
    this.generateCalls += 1
    return { raw: this.initialResponse }
  }

  getGenerateCalls(): number {
    return this.generateCalls
  }
}
