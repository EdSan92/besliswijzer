import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb, DrizzlePipelineRunStore } from '@besliswijzer/db'
import {
  PipelineOrchestrator,
  createPipelineRun,
} from '@besliswijzer/pipeline-schema'
import {
  DEFAULT_PIPELINE_STEP_KEYS,
  PIPELINE_VERSION,
  createDefaultPipelineHandlers,
  createPipelineProviders,
} from '../index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../../.env') })

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://decision:decision@localhost:5432/besliswijzer'

async function main() {
  if (process.env.PIPELINE_USE_LIVE_PROVIDERS !== 'true') {
    console.error('Set PIPELINE_USE_LIVE_PROVIDERS=true before running staging live pipeline.')
    process.exitCode = 1
    return
  }

  const providers = createPipelineProviders()
  const { db, client } = createDb(connectionString)
  const store = new DrizzlePipelineRunStore(db)
  const suffix = new Date().toISOString().replace(/[:.]/g, '-')

  try {
    const run = await store.save(
      createPipelineRun({
        categorySlug: process.env.PIPELINE_STAGING_CATEGORY ?? 'airfryers',
        language: 'nl',
        pipelineVersion: PIPELINE_VERSION,
        inputVersion: `staging-live-${suffix}`,
        stepKeys: [...DEFAULT_PIPELINE_STEP_KEYS],
      }),
    )

    const orchestrator = new PipelineOrchestrator({
      store,
      handlers: createDefaultPipelineHandlers({
        keywordProvider: providers.keywordProvider,
        flowBriefProvider: providers.flowBriefProvider,
        contentPackageProvider: providers.contentPackageProvider,
      }),
    })

    const completed = await orchestrator.start({
      runId: run.id,
      initialInput: {
        primaryKeyword: process.env.PIPELINE_STAGING_KEYWORD ?? 'airfryer kopen',
        categoryTitle: process.env.PIPELINE_STAGING_CATEGORY ?? 'Airfryers',
      },
    })

    console.log(
      JSON.stringify({
        event: 'pipeline.staging_live.completed',
        runId: completed.id,
        status: completed.status,
        artifactKinds: [...new Set(completed.artifacts.map((artifact) => artifact.kind))],
      }),
    )

    if (completed.status !== 'needs_review') {
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
