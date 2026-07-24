import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import { flowCategories, flows, type createDb } from './index.js'
import { ROBOT_FLOW_SLUG, seedRobotProductPage } from './seed-product-page.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

type Db = ReturnType<typeof createDb>['db']

export async function ensureTuinCategory(db: Db) {
  const existing = await db.query.flowCategories.findFirst({
    where: eq(flowCategories.slug, 'tuin-en-buitenleven'),
  })

  if (existing) return existing

  const [category] = await db
    .insert(flowCategories)
    .values({
      slug: 'tuin-en-buitenleven',
      title: 'Tuin & buitenleven',
      description: 'Robotmaaiers, tuinmeubelen en buitenleven',
      sortOrder: 4,
    })
    .returning()

  console.log('Seeded category tuin-en-buitenleven')
  return category!
}

export async function ensureRobotMaaierFlow(db: Db) {
  const existing = await db.query.flows.findFirst({
    where: eq(flows.slug, ROBOT_FLOW_SLUG),
  })

  if (existing?.currentPublishedVersionId) {
    console.log(`Robotmaaier flow "${ROBOT_FLOW_SLUG}" already published, skipping import`)
    return existing
  }

  console.log('Importing robotmaaier reference flow...')
  execSync(
    'pnpm flow:import flows/examples/robot-grasmaaier-keuzehulp.json --publish --overwrite',
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    },
  )

  return db.query.flows.findFirst({
    where: eq(flows.slug, ROBOT_FLOW_SLUG),
  })
}

export async function ensureRobotMaaierReference(db: Db) {
  await ensureTuinCategory(db)
  await ensureRobotMaaierFlow(db)
  await seedRobotProductPage(db)
}
