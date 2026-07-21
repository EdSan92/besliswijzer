import type { Request, Response } from 'express'
import { generateProductFlowRequestSchema } from '../../models/product-page-content.js'
import type { ProductFlowAgent } from '../../services/product-flow.agent.js'

export class ProductFlowController {
  constructor(private readonly agent: ProductFlowAgent) {}

  generate = async (req: Request, res: Response): Promise<void> => {
    const body = generateProductFlowRequestSchema.parse(req.body ?? {})
    const flow = await this.agent.generate(body)
    res.json({ flow })
  }
}
