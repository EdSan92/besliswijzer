import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createDb } from '@besliswijzer/db'
import { buildProductFlowGroups } from '@besliswijzer/product-schema'
import { archiveDeprecatedFlowsForGroups } from '../services/archive-product-flows-service.js'
import {
  mergeAllProductFlows,
  resolveCanonicalFlowIdForGroup,
  resolveCanonicalFlowSlugForGroup,
} from '../services/merge-product-flows-service.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../../.env') })

function usage() {
  console.log(`Usage: pnpm migrate:merge-product-flows [options]

Voegt keyword-specifieke flows samen tot één flow per productpagina.

Options:
  --dry-run           Toon wat er zou gebeuren, zonder te schrijven
  --no-publish        Importeer als draft (standaard: publiceren)
  --no-archive        Sla archiveren van oude flows over
  --archive-only      Alleen verouderde keyword-flows archiveren (geen merge)
  --product=<slug>    Alleen dit product migreren (bijv. robotmaaier)
`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    usage()
    return
  }

  const dryRun = args.includes('--dry-run')
  const publish = !args.includes('--no-publish')
  const skipArchive = args.includes('--no-archive')
  const archiveOnly = args.includes('--archive-only')
  const productArg = args.find((arg) => arg.startsWith('--product='))
  const productSlug = productArg?.split('=')[1]

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL ontbreekt in .env')
    process.exit(1)
  }

  const { db, client } = createDb(connectionString)

  try {
    const catalog = await db.query.products.findMany({
      with: {
        primaryFlow: true,
        keywords: true,
        pages: true,
      },
    })

    const flows = await db.query.flows.findMany({
      columns: { id: true, slug: true, title: true },
    })

    const groups = buildProductFlowGroups(
      catalog.map((product) => ({
        productId: product.id,
        productSlug: product.slug,
        productTitle: product.title,
        canonicalName: product.canonicalName,
        categoryId: product.categoryId,
        primaryFlowId: product.primaryFlowId,
        primaryFlowSlug: product.primaryFlow?.slug ?? null,
        pageSlug: product.pages.find((page) => page.status === 'published')?.slug ?? null,
        keywordTerms: product.keywords.map((keyword) => keyword.term),
      })),
      flows,
    )

    const candidates = groups.filter((group) => group.flowIds.length >= 2)
    console.log(
      JSON.stringify(
        {
          mode: dryRun ? 'dry-run' : 'apply',
          publish,
          skipArchive,
          archiveOnly,
          totalProducts: groups.length,
          mergeCandidates: candidates.length,
          groups: groups.map((group) => ({
            productSlug: group.productSlug,
            flowSlugs: group.flowSlugs,
            pageSlug: group.pageSlug,
          })),
        },
        null,
        2,
      ),
    )

    if (archiveOnly) {
      const archiveResults = await archiveDeprecatedFlowsForGroups(
        db,
        groups,
        (group) => resolveCanonicalFlowIdForGroup(group),
        { dryRun, productSlug },
      )
      console.log(JSON.stringify({ archiveResults }, null, 2))
      return
    }

    const results = await mergeAllProductFlows(db, groups, {
      dryRun,
      publish,
      productSlug,
      skipArchive,
    })

    console.log(JSON.stringify({ results }, null, 2))
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
