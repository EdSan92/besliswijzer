import type { Category } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export class CategoryRepository {
  async findSeedCategories(): Promise<Category[]> {
    return prisma.category.findMany({ where: { isSeed: true }, orderBy: { name: 'asc' } })
  }

  async findByName(name: string): Promise<Category | null> {
    return prisma.category.findFirst({ where: { name } })
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { slug } })
  }

  async createSeed(name: string, slug: string, description?: string): Promise<Category> {
    return prisma.category.upsert({
      where: { slug },
      create: { name, slug, description, isSeed: true },
      update: { name, description, isSeed: true },
    })
  }
}
