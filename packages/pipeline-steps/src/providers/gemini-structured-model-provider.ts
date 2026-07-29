import type { ContentPackageModelProvider, ContentPackageModelResponse } from '@besliswijzer/content-package'
import type { FlowBriefModelProvider, FlowBriefModelResponse } from '@besliswijzer/flow-brief'
import { GeminiStructuredClient } from './gemini-structured-client.js'

export class GeminiStructuredModelProvider
  implements FlowBriefModelProvider, ContentPackageModelProvider
{
  readonly provider = 'gemini'
  readonly model: string
  private readonly client: GeminiStructuredClient

  constructor(options: { client: GeminiStructuredClient; model: string }) {
    this.model = options.model
    this.client = options.client
  }

  async generateStructured(prompt: string): Promise<FlowBriefModelResponse & ContentPackageModelResponse> {
    const { raw } = await this.client.generateJson(prompt, 'generate')
    return { raw }
  }

  async repairStructured(
    prompt: string,
    invalidOutput: unknown,
    errors: string[],
  ): Promise<FlowBriefModelResponse & ContentPackageModelResponse> {
    const repairPrompt = [
      prompt,
      '',
      'Repair the JSON output. Fix these validation errors:',
      ...errors.map((error) => `- ${error}`),
      '',
      'Invalid output:',
      JSON.stringify(invalidOutput),
    ].join('\n')

    const { raw } = await this.client.generateJson(repairPrompt, 'repair')
    return { raw }
  }
}
