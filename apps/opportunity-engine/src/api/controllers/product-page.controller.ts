import type { Request, Response } from 'express'
import {
  generateProductPageRequestSchema,
  regenerateProductPageRequestSchema,
} from '../../models/product-page-content.js'
import type { ProductPageContentAgent } from '../../services/product-page-content.agent.js'

export class ProductPageController {
  constructor(private readonly agent: ProductPageContentAgent) {}

  generate = async (req: Request, res: Response): Promise<void> => {
    const body = generateProductPageRequestSchema.parse(req.body ?? {})
    const result = await this.agent.generateAndSave(body)
    res.status(201).json(result)
  }

  preview = async (req: Request, res: Response): Promise<void> => {
    const body = generateProductPageRequestSchema.parse(req.body ?? {})
    const result = await this.agent.generateContent(body)
    res.json(result)
  }

  regenerate = async (req: Request, res: Response): Promise<void> => {
    const body = regenerateProductPageRequestSchema.parse(req.body ?? {})
    const result = await this.agent.regenerateAndSave(body)
    res.json(result)
  }
}
