import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import { flowCategories, flows, type createDb } from './index.js'
import {
  ROBOTSTOFZUIGER_FLOW_SLUG,
  seedRobotstofzuigerProductPage,
} from './seed-robotstofzuiger-product-page.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

type Db = ReturnType<typeof createDb>['db']

export async function ensureHuishoudenCategory(db: Db) {
  const existing = await db.query.flowCategories.findFirst({
    where: eq(flowCategories.slug, 'huishouden'),
  })

  if (existing) return existing

  const [category] = await db
    .insert(flowCategories)
    .values({
      slug: 'huishouden',
      title: 'Huishouden',
      description: 'Robotstofzuigers en schoonmaakhulpmiddelen',
      sortOrder: 6,
    })
    .returning()

  console.log('Seeded category huishouden')
  return category!
}

export async function ensureRobotstofzuigerFlow(db: Db) {
  const existing = await db.query.flows.findFirst({
    where: eq(flows.slug, ROBOTSTOFZUIGER_FLOW_SLUG),
  })

  if (existing?.currentPublishedVersionId) {
    console.log(`Re-importing robotstofzuiger reference flow "${ROBOTSTOFZUIGER_FLOW_SLUG}" with overwrite...`)
  } else {
    console.log('Importing robotstofzuiger reference flow...')
  }

  execSync('pnpm flow:import flows/examples/robotstofzuiger-keuzehulp.json --publish --overwrite', {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  })

  return db.query.flows.findFirst({
    where: eq(flows.slug, ROBOTSTOFZUIGER_FLOW_SLUG),
  })
}

export async function ensureRobotstofzuigerReference(db: Db) {
  await ensureHuishoudenCategory(db)
  await ensureRobotstofzuigerFlow(db)
  await seedRobotstofzuigerProductPage(db)
}
