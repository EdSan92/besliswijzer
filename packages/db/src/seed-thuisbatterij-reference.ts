import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import { flowCategories, flows, type createDb } from './index.js'
import {
  THUISBATTERIJ_FLOW_SLUG,
  seedThuisbatterijProductPage,
} from './seed-thuisbatterij-product-page.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

type Db = ReturnType<typeof createDb>['db']

export async function ensureEnergieCategory(db: Db) {
  const existing = await db.query.flowCategories.findFirst({
    where: eq(flowCategories.slug, 'energie'),
  })

  if (existing) return existing

  const [category] = await db
    .insert(flowCategories)
    .values({
      slug: 'energie',
      title: 'Energie',
      description: 'Warmtepomp, thuisbatterij en energiebesparing',
      sortOrder: 1,
    })
    .returning()

  console.log('Seeded category energie')
  return category!
}

export async function ensureThuisbatterijFlow(db: Db) {
  const existing = await db.query.flows.findFirst({
    where: eq(flows.slug, THUISBATTERIJ_FLOW_SLUG),
  })

  if (existing?.currentPublishedVersionId) {
    console.log(`Re-importing thuisbatterij reference flow "${THUISBATTERIJ_FLOW_SLUG}" with overwrite...`)
  } else {
    console.log('Importing thuisbatterij reference flow...')
  }

  execSync('pnpm flow:import flows/examples/thuisbatterij-keuzehulp.json --publish --overwrite', {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  })

  return db.query.flows.findFirst({
    where: eq(flows.slug, THUISBATTERIJ_FLOW_SLUG),
  })
}

export async function ensureThuisbatterijReference(db: Db) {
  await ensureEnergieCategory(db)
  await ensureThuisbatterijFlow(db)
  await seedThuisbatterijProductPage(db)
}
