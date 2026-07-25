import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import { flowCategories, flows, type createDb } from './index.js'
import { AIRFRYER_FLOW_SLUG, seedAirfryerProductPage } from './seed-airfryer-product-page.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

type Db = ReturnType<typeof createDb>['db']

export async function ensureKeukenCategory(db: Db) {
  const existing = await db.query.flowCategories.findFirst({
    where: eq(flowCategories.slug, 'keuken-apparaten'),
  })

  if (existing) return existing

  const [category] = await db
    .insert(flowCategories)
    .values({
      slug: 'keuken-apparaten',
      title: 'Keuken & apparaten',
      description: 'Airfryers, keukenmachines en klein huishoudelijk',
      sortOrder: 5,
    })
    .returning()

  console.log('Seeded category keuken-apparaten')
  return category!
}

export async function ensureAirfryerFlow(db: Db) {
  const existing = await db.query.flows.findFirst({
    where: eq(flows.slug, AIRFRYER_FLOW_SLUG),
  })

  if (existing?.currentPublishedVersionId) {
    console.log(`Airfryer flow "${AIRFRYER_FLOW_SLUG}" already published, skipping import`)
    return existing
  }

  console.log('Importing airfryer reference flow...')
  execSync('pnpm flow:import flows/examples/airfryer-keuzehulp.json --publish --overwrite', {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  })

  return db.query.flows.findFirst({
    where: eq(flows.slug, AIRFRYER_FLOW_SLUG),
  })
}

export async function ensureAirfryerReference(db: Db) {
  await ensureKeukenCategory(db)
  await ensureAirfryerFlow(db)
  await seedAirfryerProductPage(db)
}
