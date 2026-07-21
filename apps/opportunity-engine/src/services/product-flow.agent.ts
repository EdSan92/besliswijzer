import type { AIProvider } from '../providers/ai/ai-provider.interface.js'
import { flowDefinitionSchema, type FlowDefinition } from '../models/schemas.js'
import type { GenerateProductFlowRequest } from '../models/product-page-content.js'
import type { PromptBuilder } from './prompt-builder.service.js'

export class ProductFlowAgent {
  constructor(
    private readonly aiProvider: AIProvider,
    private readonly promptBuilder: PromptBuilder,
  ) {}

  async generate(input: GenerateProductFlowRequest): Promise<FlowDefinition> {
    const prompt = this.promptBuilder.generateProductFlow({
      productTitle: input.productTitle,
      canonicalName: input.canonicalName,
      category: input.categoryTitle,
      flowSlug: input.flowSlug,
      keywords: input.keywords,
    })

    const { data } = await this.aiProvider.generateObject(flowDefinitionSchema, prompt, {
      promptName: 'generate-product-flow',
    })

    return { ...data, slug: input.flowSlug }
  }
}
