import {
  DEPRECATED_SEED_CATEGORIES,
  WEBSHOP_SEED_CATEGORIES,
} from '../utils/product-focus.js'
import { CategoryRepository } from '../repositories/category.repository.js'
import { toSlug } from '../utils/hash.js'
import { logger } from '../utils/logger.js'
import { disconnectDatabase, prisma } from './prisma.js'

async function seed() {
  const categoryRepo = new CategoryRepository()

  for (const name of DEPRECATED_SEED_CATEGORIES) {
    await prisma.category.updateMany({
      where: { name },
      data: { isSeed: false },
    })
    logger.info({ category: name }, 'Deprecated seed category deactivated')
  }

  for (const category of WEBSHOP_SEED_CATEGORIES) {
    await categoryRepo.createSeed(category.name, toSlug(category.name), category.description)
    logger.info({ category: category.name }, 'Webshop seed category upserted')
  }

  logger.info({ count: WEBSHOP_SEED_CATEGORIES.length }, 'Seed completed')
}

seed()
  .catch((error) => {
    logger.error({ error }, 'Seed failed')
    process.exit(1)
  })
  .finally(async () => {
    await disconnectDatabase()
  })
