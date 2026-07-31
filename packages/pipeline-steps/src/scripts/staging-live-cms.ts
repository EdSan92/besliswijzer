import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb, DrizzlePipelineRunStore } from '@besliswijzer/db'
import {
  assertStagingLiveCmsConfig,
  runStagingLiveCmsPublish,
} from '@besliswijzer/pipeline-publish'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../../.env') })

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://decision:decision@localhost:5432/besliswijzer'

async function main() {
  assertStagingLiveCmsConfig(process.env)

  const { db, client } = createDb(connectionString)
  const store = new DrizzlePipelineRunStore(db)

  try {
    const includeProductPage = process.env.PIPELINE_STAGING_CMS_INCLUDE_PRODUCT_PAGE === 'true'
    const result = await runStagingLiveCmsPublish({
      store,
      runId: process.env.PIPELINE_STAGING_CMS_RUN_ID,
      flowSlug: process.env.PIPELINE_STAGING_CMS_FLOW_SLUG,
      productPageSlug: process.env.PIPELINE_STAGING_CMS_PRODUCT_PAGE_SLUG,
      includeProductPage,
    })

    console.log(
      JSON.stringify({
        event: 'pipeline.staging_live_cms.completed',
        runId: result.runId,
        checks: result.checks,
        firstPublished: result.first.published,
        secondAlreadyPublished: result.second.alreadyPublished,
        flowRemoteId: result.first.flow?.remoteId,
        productPageRemoteId: result.first.productPage?.remoteId,
        mockMode: false,
        mode: 'draft',
      }),
    )

    if (!result.checks.includes('publish.idempotent')) {
      process.exitCode = 1
    }
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
