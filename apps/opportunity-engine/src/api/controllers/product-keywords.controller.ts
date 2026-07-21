import type { Request, Response } from 'express'
import type { ProductKeywordsService } from '../../services/product-keywords.service.js'

export class ProductKeywordsController {
  constructor(private readonly service: ProductKeywordsService) {}

  listForProduct = async (req: Request, res: Response): Promise<void> => {
    const productSlug = String(req.params.productSlug ?? '').trim()
    if (productSlug.length < 2) {
      res.status(400).json({ error: 'productSlug is required' })
      return
    }

    const keywords = await this.service.listForProduct(productSlug)
    res.json({ productSlug, keywords })
  }
}
