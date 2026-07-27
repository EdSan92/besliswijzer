import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import { flowCategories, flows, type createDb } from './index.js'
import { MESH_WIFI_FLOW_SLUG, seedMeshWifiProductPage } from './seed-mesh-wifi-product-page.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

type Db = ReturnType<typeof createDb>['db']

export async function ensureTechNetwerkCategory(db: Db) {
  const existing = await db.query.flowCategories.findFirst({
    where: eq(flowCategories.slug, 'tech-netwerk'),
  })

  if (existing) return existing

  const [category] = await db
    .insert(flowCategories)
    .values({
      slug: 'tech-netwerk',
      title: 'Tech & netwerk',
      description: 'Mesh wifi, routers en thuisnetwerk',
      sortOrder: 7,
    })
    .returning()

  console.log('Seeded category tech-netwerk')
  return category!
}

export async function ensureMeshWifiFlow(db: Db) {
  const existing = await db.query.flows.findFirst({
    where: eq(flows.slug, MESH_WIFI_FLOW_SLUG),
  })

  if (existing?.currentPublishedVersionId) {
    console.log(`Re-importing mesh wifi reference flow "${MESH_WIFI_FLOW_SLUG}" with overwrite...`)
  } else {
    console.log('Importing mesh wifi reference flow...')
  }

  execSync('pnpm flow:import flows/examples/mesh-wifi-keuzehulp.json --publish --overwrite', {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  })

  return db.query.flows.findFirst({
    where: eq(flows.slug, MESH_WIFI_FLOW_SLUG),
  })
}

export async function ensureMeshWifiReference(db: Db) {
  await ensureTechNetwerkCategory(db)
  await ensureMeshWifiFlow(db)
  await seedMeshWifiProductPage(db)
}
