import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb, DrizzlePipelineRunStore } from '@besliswijzer/db'
import {
  assertStagingLiveKeywordConfig,
  runStagingLiveKeywordIngest,
} from '../staging-live-keyword.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../../.env') })

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://decision:decision@localhost:5432/besliswijzer'

async function main() {
  assertStagingLiveKeywordConfig(process.env)

  const { db, client } = createDb(connectionString)
  const store = new DrizzlePipelineRunStore(db)

  try {
    const completed = await runStagingLiveKeywordIngest({ store })
    const keywordArtifact = completed.artifacts.find((artifact) => artifact.kind === 'keyword_data')

    console.log(
      JSON.stringify({
        event: 'pipeline.staging_live_keyword.completed',
        runId: completed.id,
        status: completed.status,
        variantCount: Array.isArray((keywordArtifact?.payload as { variants?: unknown[] })?.variants)
          ? (keywordArtifact?.payload as { variants: unknown[] }).variants.length
          : 0,
        provider: (keywordArtifact?.payload as { source?: { provider?: string } })?.source?.provider,
        mockMode: false,
      }),
    )

    if (completed.status !== 'needs_review' || !keywordArtifact) {
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
