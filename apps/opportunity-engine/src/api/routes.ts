import { Router } from 'express'
import type { OpportunityController } from './controllers/opportunity.controller.js'
import type { ProductFlowController } from './controllers/product-flow.controller.js'
import type { ProductKeywordsController } from './controllers/product-keywords.controller.js'
import type { ProductPageController } from './controllers/product-page.controller.js'
import type { StatisticsController } from './controllers/statistics.controller.js'

export function createApiRouter(
  opportunityController: OpportunityController,
  statisticsController: StatisticsController,
  productPageController: ProductPageController,
  productKeywordsController: ProductKeywordsController,
  productFlowController: ProductFlowController,
): Router {
  const router = Router()

  router.post('/opportunities/discover', (req, res, next) => {
    opportunityController.discover(req, res).catch(next)
  })

  router.get('/opportunities', (req, res, next) => {
    opportunityController.list(req, res).catch(next)
  })

  router.post('/opportunities/generate-flows', (req, res, next) => {
    opportunityController.generateFlows(req, res).catch(next)
  })

  router.post('/opportunities/:id/score', (req, res, next) => {
    opportunityController.score(req, res).catch(next)
  })

  router.post('/opportunities/:id/generate-flow', (req, res, next) => {
    opportunityController.generateFlow(req, res).catch(next)
  })

  router.get('/statistics', (req, res, next) => {
    statisticsController.get(req, res).catch(next)
  })

  router.post('/product-pages/generate', (req, res, next) => {
    productPageController.generate(req, res).catch(next)
  })

  router.post('/product-pages/preview', (req, res, next) => {
    productPageController.preview(req, res).catch(next)
  })

  router.post('/product-pages/regenerate', (req, res, next) => {
    productPageController.regenerate(req, res).catch(next)
  })

  router.get('/products/:productSlug/keywords', (req, res, next) => {
    productKeywordsController.listForProduct(req, res).catch(next)
  })

  router.post('/product-flows/generate', (req, res, next) => {
    productFlowController.generate(req, res).catch(next)
  })

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'opportunity-engine' })
  })

  return router
}
